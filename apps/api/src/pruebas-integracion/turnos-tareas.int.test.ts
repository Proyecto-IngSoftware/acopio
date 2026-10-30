import {
  ACOPIO_A,
  ADMIN,
  crearAppPrueba,
  iniciarSesion,
  unico,
  type AppPrueba,
  reservaDeCaptchas,
} from '../../test/app-prueba';
import { TareasTurnosService } from '../modulos/turnos/tareas-turnos.service';
import { sembrarCausasDemo, sembrarTurnosDemo } from '../seed/demo';

/** Lunes 19 de octubre de 2026, 10:00 en Bogotá. */
const AHORA = Date.parse('2026-10-19T15:00:00Z');

/** Bloque 5: correos de turnos, recordatorio y borrado de datos (RF-TUR-003, 004, T-05, T-06). */
describe('turnos: correos y tareas', () => {
  let a: AppPrueba;
  let captchaLibre: () => string;
  let admin: string;
  let tareas: TareasTurnosService;

  beforeAll(async () => {
    a = await crearAppPrueba({ ahora: AHORA });
    captchaLibre = await reservaDeCaptchas(a, 40);
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    tareas = a.app.get(TareasTurnosService);
  });
  afterAll(() => a.cerrar());

  const como = () => ({ authorization: `Bearer ${admin}` });

  async function crearJornada(fecha = '2026-10-21') {
    const r = await a
      .http()
      .post('/api/turnos/gestion/jornadas')
      .set({ authorization: `Bearer ${admin}` })
      .send({
        acopioId: ACOPIO_A,
        titulo: unico('Cargar camiones '),
        descripcion: 'Subir las cajas de mercado a los camiones de la tarde',
        queLlevar: 'Guantes y agua',
        fechas: [fecha],
        horaInicio: '08:00',
        horaFin: '12:00',
        cupoMaximo: 10,
        requisitos: { ropaCerrada: true, carga: true },
      })
      .expect(201);
    return r.body[0].id as string;
  }

  const reservar = async (jornadaId: string) => {
    const correo = `${unico('vol')}@demo.test`;
    const r = await a
      .http()
      .post(`/api/turnos/jornadas/${jornadaId}/reservas`)
      .set('X-Captcha', captchaLibre())
      .send({ nombre: 'Voluntaria', correo, telefono: '300 123 4567', consentimiento: true })
      .expect(201);
    return { correo, codigo: r.body.codigo as string, secreto: r.body.secreto as string };
  };

  const correosDe = (destinatario: string) =>
    a.prisma.correoSaliente.findMany({ where: { destinatario }, orderBy: { creado_en: 'asc' } });

  it('reservar encola la confirmación con el código y el enlace con el secreto', async () => {
    const j = await crearJornada();
    const { correo, codigo, secreto } = await reservar(j);
    const [c] = await correosDe(correo);
    expect(c!.asunto).toContain('reserva');
    expect(c!.cuerpo_texto).toContain(codigo);
    expect(c!.cuerpo_texto).toContain(`/voluntariado/reserva/${codigo}#${secreto}`);
    expect(c!.cuerpo_texto).toContain('Guantes y agua');
  });

  it('mover o cancelar la jornada avisa a las reservas activas, no a las canceladas', async () => {
    const j = await crearJornada();
    const activa = await reservar(j);
    const cancelada = await reservar(j);
    await a
      .http()
      .post(`/api/turnos/reservas/${cancelada.codigo}/cancelar`)
      .send({ secreto: cancelada.secreto })
      .expect(200);
    expect((await correosDe(cancelada.correo)).map((c) => c.asunto)).toHaveLength(2);

    await a
      .http()
      .patch(`/api/turnos/gestion/jornadas/${j}`)
      .set(como())
      .send({ titulo: 'Cargar camiones, turno largo' })
      .expect(200);
    expect(await correosDe(activa.correo)).toHaveLength(1);

    await a
      .http()
      .patch(`/api/turnos/gestion/jornadas/${j}`)
      .set(como())
      .send({ fecha: '2026-10-22', horaInicio: '09:00', horaFin: '13:00' })
      .expect(200);
    const tras = await correosDe(activa.correo);
    expect(tras).toHaveLength(2);
    expect(tras[1]!.cuerpo_texto).toContain(`/voluntariado/${j}`);
    expect(await correosDe(cancelada.correo)).toHaveLength(2);

    await a
      .http()
      .post(`/api/turnos/gestion/jornadas/${j}/cancelar`)
      .set(como())
      .send({ motivo: 'El acopio se inundó' })
      .expect(200);
    const fin = await correosDe(activa.correo);
    expect(fin).toHaveLength(3);
    expect(fin[2]!.cuerpo_texto).toContain('El acopio se inundó');
    expect(await correosDe(cancelada.correo)).toHaveLength(2);
  });

  it('el recordatorio se encola una sola vez, 24 horas antes', async () => {
    const j = await crearJornada('2026-10-21');
    const r = await reservar(j);
    // La jornada empieza el 21 a las 13:00Z; el 20 a las 14:00Z faltan 23 horas
    expect(await tareas.recordarReservas(new Date('2026-10-20T12:00:00Z'))).toBeGreaterThanOrEqual(
      0,
    );
    expect(await correosDe(r.correo)).toHaveLength(1);
    expect(await tareas.recordarReservas(new Date('2026-10-20T14:00:00Z'))).toBeGreaterThanOrEqual(
      1,
    );
    const tras = await correosDe(r.correo);
    expect(tras).toHaveLength(2);
    expect(tras[1]!.asunto).toContain('Mañana');
    await tareas.recordarReservas(new Date('2026-10-20T14:15:00Z'));
    expect(await correosDe(r.correo)).toHaveLength(2);
  });

  it('los datos personales se borran 30 días después de la jornada', async () => {
    const j = await crearJornada('2026-10-21');
    const r = await reservar(j);
    // La jornada termina el 21 a las 17:00Z; 30 días después es el 20 de noviembre a las 17:00Z
    await tareas.borrarDatosVencidos(new Date('2026-11-20T16:59:00Z'));
    expect((await a.prisma.reserva.findUniqueOrThrow({ where: { codigo: r.codigo } })).nombre).toBe(
      'Voluntaria',
    );
    expect(
      await tareas.borrarDatosVencidos(new Date('2026-11-20T17:01:00Z')),
    ).toBeGreaterThanOrEqual(1);
    const fila = await a.prisma.reserva.findUniqueOrThrow({ where: { codigo: r.codigo } });
    expect(fila).toMatchObject({ nombre: null, correo: null, telefono: null, estado: 'ACTIVA' });
    expect(fila.datos_borrados_en).not.toBeNull();

    const vista = await a
      .http()
      .post(`/api/turnos/reservas/${r.codigo}/consultar`)
      .send({ secreto: r.secreto })
      .expect(200);
    expect(vista.body.nombre).toBeNull();
    const inscritos = await a
      .http()
      .get(`/api/turnos/gestion/jornadas/${j}/reservas`)
      .set(como())
      .expect(200);
    expect(inscritos.body[0]).toMatchObject({ nombre: null, correo: null });
  });

  it('la demo de turnos es idempotente y trae la jornada de la Cruz Roja', async () => {
    const adminId = (
      await a.prisma.usuario.findUniqueOrThrow({ where: { username: ADMIN.username } })
    ).id;
    await sembrarCausasDemo(a.prisma, adminId, new Date(AHORA));
    await sembrarTurnosDemo(a.prisma, adminId, new Date(AHORA));
    const contar = () => a.prisma.jornada.count({ where: { titulo: { contains: '(demo)' } } });
    const primera = await contar();
    expect(primera).toBeGreaterThan(0);
    await sembrarTurnosDemo(a.prisma, adminId, new Date(AHORA));
    expect(await contar()).toBe(primera);
    const r = await a.http().get('/api/turnos/jornadas?perfil=CONDUCTOR_C2').expect(200);
    const cruzRoja = r.body.find((j: { titulo: string }) => j.titulo.includes('(demo)'));
    expect(cruzRoja.lugar).toMatchObject({ tipo: 'ENTIDAD', nombre: 'Cruz Roja Colombiana' });
  });
});
