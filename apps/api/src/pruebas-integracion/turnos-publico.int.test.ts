import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
  reservaDeCaptchas,
} from '../../test/app-prueba';

/** Lunes 19 de octubre de 2026, 10:00 en Bogotá. */
const AHORA = Date.parse('2026-10-19T15:00:00Z');
const HORA = 3_600_000;

/** Bloque 5: listado público, inscritos y asistencia (RF-TUR-002, RF-TUR-005, RF-TUR-006). */
describe('turnos: público e inscritos', () => {
  let a: AppPrueba;
  let captchaLibre: () => string;
  let admin: string;
  let operador: string;
  let adminId: string;
  /** Marca que llevan los títulos de esta suite, para no mirar lo de otras. */
  const marca = unico('pub');

  beforeAll(async () => {
    a = await crearAppPrueba({ ahora: AHORA });
    captchaLibre = await reservaDeCaptchas(a, 40);
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findUniqueOrThrow({ where: { username: ADMIN.username } }))
      .id;
    const op = await crearUsuarioActivo(a, admin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    operador = op.token;
  });
  afterAll(() => a.cerrar());

  const como = (token: string) => ({ authorization: `Bearer ${token}` });

  const insertar = (titulo: string, extra: object = {}) =>
    a.prisma.jornada.create({
      data: {
        acopio_id: ACOPIO_A,
        titulo: `${marca} ${titulo}`,
        descripcion: 'Armar mercados con lo que llegó en la mañana',
        inicio: new Date('2026-10-21T13:00:00Z'),
        fin: new Date('2026-10-21T17:00:00Z'),
        cupo_maximo: 10,
        creada_por: adminId,
        ...extra,
      },
    });

  async function entidadVerificada() {
    const r = await a
      .http()
      .post('/api/entidades')
      .set(como(admin))
      .send({
        nombre: unico('Fundación '),
        tipo: 'Fundación',
        sitioWeb: 'https://www.fundacion.org',
      })
      .expect(201);
    await a
      .http()
      .post(`/api/entidades/${r.body.id}/verificar`)
      .set(como(admin))
      .send({ confirmo: true })
      .expect(200);
    return r.body.id as string;
  }

  const deEntidad = (entidadId: string, titulo: string, extra: object = {}) =>
    insertar(titulo, {
      acopio_id: null,
      entidad_id: entidadId,
      direccion: 'Parque principal',
      municipio: 'Mocoa',
      inicio: new Date('2026-10-22T13:00:00Z'),
      fin: new Date('2026-10-22T17:00:00Z'),
      perfil_requerido: 'CONDUCTOR_C2',
      ...extra,
    });

  const listar = async (consulta = '') => {
    const r = await a.http().get(`/api/turnos/jornadas${consulta}`).expect(200);
    return r.body.filter((j: { titulo: string }) => j.titulo.startsWith(marca));
  };
  const enGestion = async (jornadaId: string) => {
    const r = await a.http().get('/api/turnos/gestion/jornadas').set(como(operador)).expect(200);
    return r.body.find((j: { id: string }) => j.id === jornadaId) as {
      puedeMarcarAsistencia: boolean;
    };
  };
  const titulos = (js: { titulo: string }[]) =>
    js.map((j) => j.titulo.replace(`${marca} `, '')).sort();

  const reservar = (
    jornadaId: string,
    nombre: string,
    correo: string,
    perfil = false,
    telefono?: string,
  ) =>
    a
      .http()
      .post(`/api/turnos/jornadas/${jornadaId}/reservas`)
      .set('X-Captcha', captchaLibre())
      .send({ nombre, correo, telefono, perfilDeclarado: perfil, consentimiento: true })
      .expect(201);

  it('lista las jornadas vigentes, con filtros por perfil, acopio y día', async () => {
    const entidadId = await entidadVerificada();
    await insertar('acopio');
    await deEntidad(entidadId, 'entidad');
    await insertar('cancelada', { estado: 'CANCELADA' });
    await insertar('terminada', {
      inicio: new Date(AHORA - 5 * HORA),
      fin: new Date(AHORA - HORA),
    });
    await insertar('otro acopio', { acopio_id: ACOPIO_B });

    expect(titulos(await listar())).toEqual(['acopio', 'entidad', 'otro acopio']);
    expect(titulos(await listar('?perfil=CONDUCTOR_C2'))).toEqual(['entidad']);
    expect(titulos(await listar(`?acopio=${ACOPIO_A}`))).toEqual(['acopio']);
    expect(titulos(await listar(`?entidad=${entidadId}`))).toEqual(['entidad']);
    // 22 de octubre en Bogotá: la de entidad empieza a las 08:00 de ese día
    expect(titulos(await listar('?desde=2026-10-22&hasta=2026-10-22'))).toEqual(['entidad']);
  });

  it('un día que no existe da 400, no 500 (P-071)', async () => {
    for (const dia of ['2026-13-01', '2026-02-30']) {
      const r = await a.http().get(`/api/turnos/jornadas?desde=${dia}`).expect(400);
      expect(r.body.codigo).toBe('VALIDACION');
    }
  });

  it('el listado y el detalle no llevan datos de los inscritos', async () => {
    const j = await insertar('privada');
    await reservar(j.id, 'Persona Pública', 'publica@demo.test');
    const lista = await a.http().get('/api/turnos/jornadas').expect(200);
    const detalle = await a.http().get(`/api/turnos/jornadas/${j.id}`).expect(200);
    for (const texto of [JSON.stringify(lista.body), JSON.stringify(detalle.body)]) {
      expect(texto).not.toContain('Persona Pública');
      expect(texto).not.toContain('publica@demo.test');
    }
    expect(detalle.body).toMatchObject({ ocupados: 1, libres: 9, aceptaReservas: true });
  });

  it('el detalle de una cancelada dice por qué', async () => {
    const j = await insertar('cancelada con motivo', {
      estado: 'CANCELADA',
      motivo_cancelacion: 'Llovió',
    });
    const r = await a.http().get(`/api/turnos/jornadas/${j.id}`).expect(200);
    expect(r.body).toMatchObject({
      estado: 'CANCELADA',
      motivoCancelacion: 'Llovió',
      aceptaReservas: false,
      motivoSinReserva: 'CANCELADA',
    });
  });

  it('sin verificación, la jornada de entidad sale del portal pero no de la consola (T-09)', async () => {
    const entidadId = await entidadVerificada();
    const j = await deEntidad(entidadId, 'perderá el sello');
    await reservar(j.id, 'Conductora', 'conductora@demo.test', true);
    await a
      .http()
      .post(`/api/entidades/${entidadId}/quitar-verificacion`)
      .set(como(admin))
      .send({})
      .expect(200);
    expect(titulos(await listar())).not.toContain('perderá el sello');
    await a.http().get(`/api/turnos/jornadas/${j.id}`).expect(404);
    await a
      .http()
      .post(`/api/turnos/jornadas/${j.id}/reservas`)
      .set('X-Captcha', captchaLibre())
      .send({
        nombre: 'Otra',
        correo: 'otra@demo.test',
        perfilDeclarado: true,
        consentimiento: true,
      })
      .expect(404);
    const inscritos = await a
      .http()
      .get(`/api/turnos/gestion/jornadas/${j.id}/reservas`)
      .set(como(admin))
      .expect(200);
    expect(inscritos.body).toHaveLength(1);
    expect(inscritos.body[0]).toMatchObject({
      nombre: 'Conductora',
      correo: 'conductora@demo.test',
      perfilDeclarado: true,
    });
  });

  it('el Operador ve los inscritos de su acopio y no los de otro', async () => {
    const propia = await insertar('inscritos propios');
    await reservar(propia.id, 'Luis', 'luis@demo.test');
    const r = await a
      .http()
      .get(`/api/turnos/gestion/jornadas/${propia.id}/reservas`)
      .set(como(operador))
      .expect(200);
    expect(r.body.map((i: { nombre: string }) => i.nombre)).toEqual(['Luis']);
    const ajena = await insertar('inscritos ajenos', { acopio_id: ACOPIO_B });
    await a
      .http()
      .get(`/api/turnos/gestion/jornadas/${ajena.id}/reservas`)
      .set(como(operador))
      .expect(403);
  });

  it('la asistencia se marca en su plazo y la bitácora no guarda a la persona', async () => {
    const futura = await insertar('asistencia futura');
    const r1 = await reservar(futura.id, 'Marta Gil', 'marta@demo.test');
    const id1 = (await a.prisma.reserva.findUniqueOrThrow({ where: { codigo: r1.body.codigo } }))
      .id;
    const fuera = await a
      .http()
      .put(`/api/turnos/gestion/reservas/${id1}/asistencia`)
      .set(como(operador))
      .send({ estado: 'ASISTIO' })
      .expect(409);
    expect(fuera.body.codigo).toBe('FUERA_DE_PLAZO_ASISTENCIA');
    expect((await enGestion(futura.id)).puedeMarcarAsistencia).toBe(false);

    const hoy = await insertar('asistencia hoy', {
      inicio: new Date(AHORA + 13 * HORA),
      fin: new Date(AHORA + 16 * HORA),
    });
    const r2 = await reservar(hoy.id, 'Marta Gil', 'marta@demo.test', false, '3105550123');
    await a.prisma.jornada.update({
      where: { id: hoy.id },
      data: { inicio: new Date(AHORA - HORA), fin: new Date(AHORA + 2 * HORA) },
    });
    const id2 = (await a.prisma.reserva.findUniqueOrThrow({ where: { codigo: r2.body.codigo } }))
      .id;
    expect((await enGestion(hoy.id)).puedeMarcarAsistencia).toBe(true);
    const ok = await a
      .http()
      .put(`/api/turnos/gestion/reservas/${id2}/asistencia`)
      .set(como(operador))
      .send({ estado: 'ASISTIO' })
      .expect(200);
    expect(ok.body.estado).toBe('ASISTIO');
    const evento = await a.prisma.bitacora.findFirstOrThrow({
      where: { accion: 'reserva.asistencia', entidad_id: id2 },
    });
    const texto = JSON.stringify(evento);
    expect(texto).not.toContain('Marta');
    expect(texto).not.toContain('marta@demo.test');
    expect(texto).not.toContain('3105550123');
    await a
      .http()
      .put(`/api/turnos/gestion/reservas/${id2}/asistencia`)
      .set(como(operador))
      .send({ estado: 'NO_ASISTIO' })
      .expect(200);
  });

  it('no se marca asistencia en una jornada cancelada', async () => {
    const j = await insertar('asistencia cancelada', {
      inicio: new Date(AHORA + 13 * HORA),
      fin: new Date(AHORA + 16 * HORA),
    });
    const r = await reservar(j.id, 'Luis Mora', 'luis@demo.test');
    await a.prisma.jornada.update({
      where: { id: j.id },
      data: { inicio: new Date(AHORA - HORA), fin: new Date(AHORA + 2 * HORA) },
    });
    await a
      .http()
      .post(`/api/turnos/gestion/jornadas/${j.id}/cancelar`)
      .set(como(operador))
      .send({ motivo: 'Se suspendió por lluvia' })
      .expect(200);
    const id = (await a.prisma.reserva.findUniqueOrThrow({ where: { codigo: r.body.codigo } })).id;
    expect((await enGestion(j.id)).puedeMarcarAsistencia).toBe(false);
    const res = await a
      .http()
      .put(`/api/turnos/gestion/reservas/${id}/asistencia`)
      .set(como(operador))
      .send({ estado: 'ASISTIO' })
      .expect(409);
    expect(res.body.codigo).toBe('JORNADA_CANCELADA');
  });
});
