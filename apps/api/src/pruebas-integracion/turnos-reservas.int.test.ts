import { createHash } from 'node:crypto';
import {
  ACOPIO_A,
  ADMIN,
  crearAppPrueba,
  iniciarSesion,
  unico,
  type AppPrueba,
  reservaDeCaptchas,
} from '../../test/app-prueba';

/** Lunes 19 de octubre de 2026, 10:00 en Bogotá. */
const AHORA = Date.parse('2026-10-19T15:00:00Z');
const HORA = 3_600_000;

/** Bloque 5: reserva pública sin cuenta (RF-TUR-003, RF-TUR-004, HU-03). */
describe('turnos: reservas', () => {
  let a: AppPrueba;
  let captchaLibre: () => string;
  let admin: string;
  let adminId: string;

  beforeAll(async () => {
    a = await crearAppPrueba({ ahora: AHORA });
    captchaLibre = await reservaDeCaptchas(a, 40);
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findUniqueOrThrow({ where: { username: ADMIN.username } }))
      .id;
  });
  afterAll(() => a.cerrar());

  /** Directo en la base, para poner el inicio donde haga falta. */
  const insertarJornada = (extra: object = {}) =>
    a.prisma.jornada.create({
      data: {
        acopio_id: ACOPIO_A,
        titulo: unico('Jornada '),
        descripcion: 'Descargar el camión de agua y ordenarla',
        inicio: new Date('2026-10-21T13:00:00Z'),
        fin: new Date('2026-10-21T17:00:00Z'),
        cupo_maximo: 2,
        creada_por: adminId,
        ...extra,
      },
    });

  const persona = (extra: object = {}) => ({
    nombre: 'Ana Pérez',
    correo: `${unico('ana')}@correo.co`,
    perfilDeclarado: false,
    consentimiento: true,
    ...extra,
  });

  const reservar = (jornadaId: string, cuerpo: object) =>
    a
      .http()
      .post(`/api/turnos/jornadas/${jornadaId}/reservas`)
      .set('X-Captcha', captchaLibre())
      .send(cuerpo);

  const libresEnGestion = async (jornadaId: string) => {
    const r = await a
      .http()
      .get('/api/turnos/gestion/jornadas')
      .set({ authorization: `Bearer ${admin}` })
      .expect(200);
    return r.body.find((j: { id: string }) => j.id === jornadaId).libres as number;
  };

  it('reserva con código, secreto y correo normalizado, sin bitácora', async () => {
    const j = await insertarJornada();
    const correo = `${unico('Ana')}@Correo.CO`;
    const antes = await a.prisma.bitacora.count({ where: { entidad: 'reserva' } });
    const r = await reservar(j.id, persona({ correo: `  ${correo} ` })).expect(201);
    expect(r.body.codigo).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    expect(r.body.secreto).toEqual(expect.any(String));
    expect(r.body.jornada.id).toBe(j.id);
    const fila = await a.prisma.reserva.findUniqueOrThrow({ where: { codigo: r.body.codigo } });
    expect(fila.correo).toBe(correo.toLowerCase());
    expect(fila.secreto_hash).toBe(createHash('sha256').update(r.body.secreto).digest('hex'));
    expect(fila.consentimiento_en.toISOString()).toBe(new Date(AHORA).toISOString());
    expect(await a.prisma.bitacora.count({ where: { entidad: 'reserva' } })).toBe(antes);

    const otra = await reservar(j.id, persona({ correo: correo.toUpperCase() })).expect(409);
    expect(otra.body.codigo).toBe('RESERVA_REPETIDA');
  });

  it('sin consentimiento no hay reserva', async () => {
    const j = await insertarJornada();
    await reservar(j.id, persona({ consentimiento: undefined })).expect(400);
    await reservar(j.id, persona({ consentimiento: false })).expect(400);
  });

  it('dos personas por el último cupo: una lo obtiene y la otra recibe JORNADA_LLENA', async () => {
    const j = await insertarJornada({ cupo_maximo: 2 });
    await reservar(j.id, persona()).expect(201);
    const [r1, r2] = await Promise.all([reservar(j.id, persona()), reservar(j.id, persona())]);
    expect([r1.status, r2.status].sort()).toEqual([201, 409]);
    expect([r1, r2].find((r) => r.status === 409)!.body.codigo).toBe('JORNADA_LLENA');
    expect(
      await a.prisma.reserva.count({ where: { jornada_id: j.id, estado: { not: 'CANCELADA' } } }),
    ).toBe(2);
  });

  it('las reservas se cierran 12 horas antes del inicio', async () => {
    const justo = await insertarJornada({
      inicio: new Date(AHORA + 12 * HORA + 60_000),
      fin: new Date(AHORA + 15 * HORA),
    });
    await reservar(justo.id, persona()).expect(201);
    const tarde = await insertarJornada({
      inicio: new Date(AHORA + 12 * HORA - 60_000),
      fin: new Date(AHORA + 15 * HORA),
    });
    const r = await reservar(tarde.id, persona()).expect(409);
    expect(r.body.codigo).toBe('RESERVAS_CERRADAS');
  });

  it('una jornada cerrada o cancelada no recibe reservas', async () => {
    const cerrada = await insertarJornada({ estado: 'CERRADA' });
    expect((await reservar(cerrada.id, persona()).expect(409)).body.codigo).toBe(
      'RESERVAS_CERRADAS',
    );
    const cancelada = await insertarJornada({ estado: 'CANCELADA' });
    expect((await reservar(cancelada.id, persona()).expect(409)).body.codigo).toBe(
      'RESERVAS_CERRADAS',
    );
  });

  it('si la jornada pide un perfil, hay que declararlo', async () => {
    const j = await insertarJornada({ perfil_requerido: 'CONDUCTOR_C2' });
    const r = await reservar(j.id, persona()).expect(422);
    expect(r.body.codigo).toBe('PERFIL_NO_DECLARADO');
    await reservar(j.id, persona({ perfilDeclarado: true })).expect(201);
  });

  it('una jornada que no existe da 404', async () => {
    const r = await reservar('99999999-9999-4999-8999-999999999999', persona()).expect(404);
    expect(r.body.codigo).toBe('JORNADA_NO_ENCONTRADA');
  });

  it('consultar y cancelar con el secreto; quien canceló puede volver a reservar', async () => {
    const j = await insertarJornada({ cupo_maximo: 3 });
    const datos = persona();
    const r = await reservar(j.id, datos).expect(201);
    const { codigo, secreto } = r.body;
    const ruta = `/api/turnos/reservas/${codigo}`;

    const vista = await a.http().post(`${ruta}/consultar`).send({ secreto }).expect(200);
    expect(vista.body).toMatchObject({
      codigo,
      estado: 'ACTIVA',
      nombre: 'Ana Pérez',
      puedeCancelar: true,
    });
    expect(vista.body.jornada.id).toBe(j.id);
    const ajeno = await a.http().post(`${ruta}/consultar`).send({ secreto: 'otro' }).expect(404);
    expect(ajeno.body.codigo).toBe('RESERVA_NO_ENCONTRADA');
    await a.http().post('/api/turnos/reservas/ZZZZZZZZ/consultar').send({ secreto }).expect(404);

    expect(await libresEnGestion(j.id)).toBe(2);
    await a.http().post(`${ruta}/cancelar`).send({ secreto: 'otro' }).expect(404);
    const c = await a.http().post(`${ruta}/cancelar`).send({ secreto }).expect(200);
    expect(c.body).toMatchObject({ estado: 'CANCELADA', puedeCancelar: false });
    expect(await libresEnGestion(j.id)).toBe(3);
    await a.http().post(`${ruta}/cancelar`).send({ secreto }).expect(200);

    await reservar(j.id, datos).expect(201);
  });

  describe('la reserva dice si la jornada cambió después de reservar', () => {
    const editar = (jornadaId: string, cuerpo: object) =>
      a
        .http()
        .patch(`/api/turnos/gestion/jornadas/${jornadaId}`)
        .set({ authorization: `Bearer ${admin}` })
        .send(cuerpo)
        .expect(200);
    const consultar = async (codigo: string, secreto: string) =>
      (
        await a
          .http()
          .post(`/api/turnos/reservas/${codigo}/consultar`)
          .send({ secreto })
          .expect(200)
      ).body;

    it('mover la hora la marca, con la hora del cambio', async () => {
      const j = await insertarJornada({ cupo_maximo: 5 });
      const { codigo, secreto } = (await reservar(j.id, persona()).expect(201)).body;
      expect((await consultar(codigo, secreto)).jornadaCambiadaEn).toBeNull();
      await editar(j.id, { fecha: '2026-10-22', horaInicio: '08:00', horaFin: '12:00' });
      expect((await consultar(codigo, secreto)).jornadaCambiadaEn).toBe(
        new Date(AHORA).toISOString(),
      );
    });

    it('cambiar solo el título no la marca', async () => {
      const j = await insertarJornada({ cupo_maximo: 5 });
      const { codigo, secreto } = (await reservar(j.id, persona()).expect(201)).body;
      await editar(j.id, { titulo: 'Descargar y ordenar el agua' });
      expect((await consultar(codigo, secreto)).jornadaCambiadaEn).toBeNull();
    });

    it('si la jornada se movió antes de reservar, no avisa', async () => {
      const j = await insertarJornada({ cupo_maximo: 5, movida_en: new Date(AHORA - HORA) });
      const { codigo, secreto } = (await reservar(j.id, persona()).expect(201)).body;
      expect((await consultar(codigo, secreto)).jornadaCambiadaEn).toBeNull();
    });
  });

  it('una reserva no se cancela después del inicio', async () => {
    const j = await insertarJornada({
      inicio: new Date(AHORA + 13 * HORA),
      fin: new Date(AHORA + 15 * HORA),
    });
    const r = await reservar(j.id, persona()).expect(201);
    await a.prisma.jornada.update({
      where: { id: j.id },
      data: { inicio: new Date(AHORA - HORA), fin: new Date(AHORA + HORA) },
    });
    const vista = await a
      .http()
      .post(`/api/turnos/reservas/${r.body.codigo}/consultar`)
      .send({ secreto: r.body.secreto })
      .expect(200);
    expect(vista.body).toMatchObject({ estado: 'ACTIVA', puedeCancelar: false });
    const c = await a
      .http()
      .post(`/api/turnos/reservas/${r.body.codigo}/cancelar`)
      .send({ secreto: r.body.secreto })
      .expect(409);
    expect(c.body.codigo).toBe('RESERVA_YA_EMPEZO');
  });
});
