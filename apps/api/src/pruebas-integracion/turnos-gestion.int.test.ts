import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** Lunes 19 de octubre de 2026, 10:00 en Bogotá. */
const AHORA = Date.parse('2026-10-19T15:00:00Z');

/** Bloque 5: gestión de jornadas desde la consola (RF-TUR-001, RF-TUR-005). */
describe('turnos: gestión', () => {
  let a: AppPrueba;
  let admin: string;
  let operador: string;

  beforeAll(async () => {
    a = await crearAppPrueba({ ahora: AHORA });
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    const op = await crearUsuarioActivo(a, admin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    operador = await iniciarSesion(a, op.username, op.contrasena);
  });
  afterAll(() => a.cerrar());

  const como = (token: string) => ({ authorization: `Bearer ${token}` });

  const datos = (extra: object = {}) => ({
    acopioId: ACOPIO_A,
    titulo: unico('Clasificar ropa '),
    descripcion: 'Separar la ropa donada por talla y temporada',
    fechas: ['2026-10-21'],
    horaInicio: '08:00',
    horaFin: '12:00',
    cupoMaximo: 5,
    requisitos: { ropaCerrada: true, carga: false },
    ...extra,
  });

  const crear = (token: string, cuerpo: object) =>
    a.http().post('/api/turnos/gestion/jornadas').set(como(token)).send(cuerpo);

  async function crearEntidad() {
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
    return r.body.id as string;
  }

  async function insertarReservas(jornadaId: string, n: number) {
    for (let i = 0; i < n; i++) {
      await a.prisma.reserva.create({
        data: {
          jornada_id: jornadaId,
          nombre: 'Persona',
          correo: `${unico('r')}@demo.test`,
          codigo: unico('K').slice(0, 20),
          secreto_hash: 'x',
          consentimiento_en: new Date(AHORA),
        },
      });
    }
  }

  it('el Operador crea una serie de tres fechas en su acopio', async () => {
    const r = await crear(
      operador,
      datos({ fechas: ['2026-10-21', '2026-10-22', '2026-10-23'] }),
    ).expect(201);
    expect(r.body).toHaveLength(3);
    expect(r.body[0].inicio).toBe('2026-10-21T13:00:00.000Z');
    expect(r.body[0].fin).toBe('2026-10-21T17:00:00.000Z');
    expect(r.body[0].lugar.tipo).toBe('ACOPIO');
    expect(r.body[0].libres).toBe(5);
    const series = new Set(r.body.map((j: { serieId: string }) => j.serieId));
    expect(series.size).toBe(1);
    expect([...series][0]).toEqual(expect.any(String));
    const eventos = await a.prisma.bitacora.count({
      where: {
        accion: 'jornada.creada',
        entidad_id: { in: r.body.map((j: { id: string }) => j.id) },
      },
    });
    expect(eventos).toBe(3);
  });

  it('el Operador no crea en otro acopio ni jornadas de entidad', async () => {
    await crear(operador, datos({ acopioId: ACOPIO_B })).expect(403);
    const entidadId = await crearEntidad();
    const r = await crear(
      operador,
      datos({ acopioId: undefined, entidadId, direccion: 'Calle 10 # 5-20', municipio: 'Bogotá' }),
    ).expect(403);
    expect(r.body.codigo).toBe('SOLO_ADMIN_ENTIDAD');
  });

  it('el Administrador crea jornadas de una entidad verificada, con su dirección', async () => {
    const entidadId = await crearEntidad();
    await crear(admin, datos({ acopioId: undefined, entidadId })).expect(400);
    const lugar = {
      acopioId: undefined,
      entidadId,
      direccion: 'Calle 10 # 5-20',
      municipio: 'Bogotá',
    };
    const sin = await crear(admin, datos(lugar)).expect(409);
    expect(sin.body.codigo).toBe('ENTIDAD_NO_VERIFICADA');
    await a
      .http()
      .post(`/api/entidades/${entidadId}/verificar`)
      .set(como(admin))
      .send({ confirmo: true })
      .expect(200);
    const r = await crear(admin, datos({ ...lugar, perfilRequerido: 'CONDUCTOR_C2' })).expect(201);
    expect(r.body[0].lugar).toMatchObject({
      tipo: 'ENTIDAD',
      id: entidadId,
      direccion: 'Calle 10 # 5-20',
      municipio: 'Bogotá',
    });
    expect(r.body[0].perfilRequerido).toBe('CONDUCTOR_C2');
    expect(r.body[0].serieId).toBeNull();
  });

  it('una jornada a menos de 13 horas no se crea', async () => {
    const r = await crear(
      operador,
      datos({ fechas: ['2026-10-19'], horaInicio: '22:00', horaFin: '23:30' }),
    ).expect(422);
    expect(r.body.codigo).toBe('JORNADA_INVALIDA');
  });

  it('el cupo y el ajuste no bajan de lo ocupado', async () => {
    const [j] = (await crear(operador, datos()).expect(201)).body;
    await insertarReservas(j.id, 3);
    const cupo = await a
      .http()
      .patch(`/api/turnos/gestion/jornadas/${j.id}`)
      .set(como(operador))
      .send({ cupoMaximo: 2 })
      .expect(409);
    expect(cupo.body.codigo).toBe('CUPO_MENOR_QUE_OCUPADOS');
    const ajustar = (cupos: number) =>
      a
        .http()
        .put(`/api/turnos/gestion/jornadas/${j.id}/ajuste`)
        .set(como(operador))
        .send({ cupos });
    expect((await ajustar(3).expect(409)).body.codigo).toBe('AJUSTE_SIN_CUPO');
    const r = await ajustar(2).expect(200);
    expect(r.body.libres).toBe(0);
    expect(r.body.ocupados).toBe(3);
    expect(r.body.ajusteActualizadoEn).toBe(new Date(AHORA).toISOString());
    // con el ajuste en 2, el cupo no baja de 5
    await a
      .http()
      .patch(`/api/turnos/gestion/jornadas/${j.id}`)
      .set(como(operador))
      .send({ cupoMaximo: 4 })
      .expect(409);
  });

  it('solo se borra una jornada que nunca tuvo reservas', async () => {
    const [con] = (await crear(operador, datos()).expect(201)).body;
    await insertarReservas(con.id, 1);
    const r = await a
      .http()
      .delete(`/api/turnos/gestion/jornadas/${con.id}`)
      .set(como(operador))
      .expect(409);
    expect(r.body.codigo).toBe('JORNADA_CON_RESERVAS');
    const [sin] = (await crear(operador, datos()).expect(201)).body;
    await a.http().delete(`/api/turnos/gestion/jornadas/${sin.id}`).set(como(operador)).expect(204);
    expect(await a.prisma.jornada.findUnique({ where: { id: sin.id } })).toBeNull();
  });

  it('cerrar, reabrir y cancelar; una cancelada ya no cambia', async () => {
    const [j] = (await crear(operador, datos()).expect(201)).body;
    const ruta = `/api/turnos/gestion/jornadas/${j.id}`;
    expect(
      (await a.http().post(`${ruta}/cerrar`).set(como(operador)).expect(200)).body.estado,
    ).toBe('CERRADA');
    expect(
      (await a.http().post(`${ruta}/reabrir`).set(como(operador)).expect(200)).body.estado,
    ).toBe('ABIERTA');
    await a.http().post(`${ruta}/cancelar`).set(como(operador)).send({}).expect(400);
    const c = await a
      .http()
      .post(`${ruta}/cancelar`)
      .set(como(operador))
      .send({ motivo: 'Ya llegó suficiente gente' })
      .expect(200);
    expect(c.body).toMatchObject({
      estado: 'CANCELADA',
      motivoCancelacion: 'Ya llegó suficiente gente',
    });
    const r = await a.http().patch(ruta).set(como(operador)).send({ cupoMaximo: 9 }).expect(409);
    expect(r.body.codigo).toBe('JORNADA_CANCELADA');
  });

  it('editar la hora valida el nuevo horario', async () => {
    const [j] = (await crear(operador, datos()).expect(201)).body;
    const ruta = `/api/turnos/gestion/jornadas/${j.id}`;
    const r = await a
      .http()
      .patch(ruta)
      .set(como(operador))
      .send({
        fecha: '2026-10-22',
        horaInicio: '09:00',
        horaFin: '13:00',
        titulo: 'Clasificar ropa y zapatos',
      })
      .expect(200);
    expect(r.body.inicio).toBe('2026-10-22T14:00:00.000Z');
    expect(r.body.titulo).toBe('Clasificar ropa y zapatos');
    const mal = await a
      .http()
      .patch(ruta)
      .set(como(operador))
      .send({ fecha: '2026-10-19', horaInicio: '20:00', horaFin: '22:00' })
      .expect(422);
    expect(mal.body.codigo).toBe('JORNADA_INVALIDA');
  });

  it('cambiar solo la dirección a menos de 12 horas se rechaza', async () => {
    const entidadId = await crearEntidad();
    await a
      .http()
      .post(`/api/entidades/${entidadId}/verificar`)
      .set(como(admin))
      .send({ confirmo: true })
      .expect(200);
    const lugar = {
      acopioId: undefined,
      entidadId,
      direccion: 'Calle 10 # 5-20',
      municipio: 'Bogotá',
    };
    const [j] = (await crear(admin, datos(lugar)).expect(201)).body;
    const ruta = `/api/turnos/gestion/jornadas/${j.id}`;
    const mover = (horas: number) =>
      a.prisma.jornada.update({
        where: { id: j.id },
        data: {
          inicio: new Date(AHORA + horas * 3_600_000),
          fin: new Date(AHORA + (horas + 3) * 3_600_000),
        },
      });
    await mover(11);
    const cerca = await a
      .http()
      .patch(ruta)
      .set(como(admin))
      .send({ direccion: 'Otra calle 1' })
      .expect(422);
    expect(cerca.body.codigo).toBe('JORNADA_INVALIDA');
    await mover(14);
    await a.http().patch(ruta).set(como(admin)).send({ direccion: 'Otra calle 1' }).expect(200);
  });

  it('dos ediciones a la vez: la bitácora de cada una compara contra lo que había al bloquear', async () => {
    const entidadId = await crearEntidad();
    await a
      .http()
      .post(`/api/entidades/${entidadId}/verificar`)
      .set(como(admin))
      .send({ confirmo: true })
      .expect(200);
    const lugar = { acopioId: undefined, entidadId, direccion: 'Calle 0', municipio: 'Bogotá' };
    const [j] = (await crear(admin, datos(lugar)).expect(201)).body;
    const ruta = `/api/turnos/gestion/jornadas/${j.id}`;
    const editar = (cuerpo: object) =>
      a.http().patch(ruta).set(como(admin)).send(cuerpo).expect(200);
    for (let i = 1; i <= 8; i++) {
      await Promise.all([editar({ direccion: `Calle ${i}` }), editar({ titulo: `Título ${i}` })]);
    }
    type Vista = { titulo: string; lugar: { direccion: string } };
    const eventos = await a.prisma.bitacora.findMany({
      where: { accion: 'jornada.editada', entidad_id: j.id },
    });
    expect(eventos).toHaveLength(16);
    for (const e of eventos) {
      const [antes, despues] = [e.datos_antes as Vista, e.datos_despues as Vista];
      // Quien solo cambió el título no aparece cambiando la dirección
      if (antes.titulo !== despues.titulo) {
        expect(despues.lugar.direccion).toBe(antes.lugar.direccion);
      }
    }
  });

  it('cada quien ve las jornadas que le tocan', async () => {
    const entidadId = await crearEntidad();
    await a
      .http()
      .post(`/api/entidades/${entidadId}/verificar`)
      .set(como(admin))
      .send({ confirmo: true });
    const titulo = unico('De entidad ');
    await crear(
      admin,
      datos({ acopioId: undefined, entidadId, direccion: 'Calle 1', municipio: 'Bogotá', titulo }),
    ).expect(201);
    const delOperador = await a
      .http()
      .get('/api/turnos/gestion/jornadas')
      .set(como(operador))
      .expect(200);
    expect(delOperador.body.some((j: { titulo: string }) => j.titulo === titulo)).toBe(false);
    expect(delOperador.body.every((j: { lugar: { id: string } }) => j.lugar.id === ACOPIO_A)).toBe(
      true,
    );
    const delAdmin = await a
      .http()
      .get('/api/turnos/gestion/jornadas')
      .set(como(admin))
      .expect(200);
    expect(delAdmin.body.some((j: { titulo: string }) => j.titulo === titulo)).toBe(true);
  });
});
