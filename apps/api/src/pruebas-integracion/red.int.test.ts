import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  EMERGENCIA_PRUEBA,
  ENTIDAD_PRUEBA,
  HORARIO_PRUEBA,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** Bloque 1: entidades, acopios, zonas y ubicaciones. */
describe('red', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  const comoAdmin = () => ({ authorization: `Bearer ${tokenAdmin}` });

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
  });
  afterAll(() => a.cerrar());

  describe('entidades (RF-RED-005)', () => {
    it('el Administrador crea y edita, y queda en la bitácora', async () => {
      const nombre = unico('Fundación ');
      const creada = await a
        .http()
        .post('/api/entidades')
        .set(comoAdmin())
        .send({ nombre, tipo: 'Fundación', nit: '900123456-7' })
        .expect(201);
      expect(creada.body).toMatchObject({ nombre, verificacion: 'SIN_VERIFICAR' });

      const editada = await a
        .http()
        .patch(`/api/entidades/${creada.body.id}`)
        .set(comoAdmin())
        .send({ telefono: '3001234567' })
        .expect(200);
      expect(editada.body.telefono).toBe('3001234567');

      const acciones = await a.prisma.bitacora.findMany({
        where: { entidad_id: creada.body.id },
        select: { accion: true },
      });
      expect(acciones.map((b) => b.accion).sort()).toEqual([
        'entidad.actualizada',
        'entidad.creada',
      ]);
    });

    it('el nombre es único sin importar mayúsculas: 409', async () => {
      const nombre = unico('Cruz ');
      await a
        .http()
        .post('/api/entidades')
        .set(comoAdmin())
        .send({ nombre, tipo: 'ONG' })
        .expect(201);
      const r = await a
        .http()
        .post('/api/entidades')
        .set(comoAdmin())
        .send({ nombre: nombre.toUpperCase(), tipo: 'ONG' })
        .expect(409);
      expect(r.body.codigo).toBe('ENTIDAD_DUPLICADA');
    });

    it('un Operador no gestiona entidades: 403', async () => {
      const op = await crearUsuarioActivo(a, tokenAdmin, {
        rol: 'OPERADOR',
        asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
      });
      await a
        .http()
        .get('/api/entidades')
        .set({ authorization: `Bearer ${op.token}` })
        .expect(403);
    });
  });

  describe('acopios (RF-RED-001, RF-RED-002, RF-RED-003)', () => {
    const nuevo = (extra: Record<string, unknown> = {}) => ({
      entidadId: ENTIDAD_PRUEBA,
      nombre: unico('Acopio '),
      direccion: 'Carrera 7 # 40-62',
      municipio: 'Bogotá',
      lat: 4.628,
      lng: -74.064,
      horario: HORARIO_PRUEBA,
      ...extra,
    });

    it('el Administrador crea un acopio y el público lo ve', async () => {
      const r = await a.http().post('/api/acopios').set(comoAdmin()).send(nuevo()).expect(201);
      expect(r.body).toMatchObject({ estado: 'ACTIVO', entidad: { id: ENTIDAD_PRUEBA } });
      const publico = await a.http().get(`/api/acopios/${r.body.id}`).expect(200);
      expect(publico.body).toMatchObject({ nombre: r.body.nombre, lat: 4.628 });
      expect(typeof publico.body.abiertoAhora).toBe('boolean');
    });

    it('un horario que cierra a las 24:00 da 422 con el detalle', async () => {
      const r = await a
        .http()
        .post('/api/acopios')
        .set(comoAdmin())
        .send(nuevo({ horario: { ...HORARIO_PRUEBA, lun: [{ abre: '08:00', cierra: '24:00' }] } }))
        .expect(422);
      expect(r.body.codigo).toBe('HORARIO_INVALIDO');
      expect(r.body.mensaje).toContain('24:00');
    });

    it('coordenadas fuera de Colombia: 400', async () => {
      await a
        .http()
        .post('/api/acopios')
        .set(comoAdmin())
        .send(nuevo({ lat: 40 }))
        .expect(400);
    });

    it('un acopio cerrado no aparece en lo público y su ficha da 404', async () => {
      const r = await a.http().post('/api/acopios').set(comoAdmin()).send(nuevo()).expect(201);
      await a
        .http()
        .patch(`/api/acopios/${r.body.id}`)
        .set(comoAdmin())
        .send({ estado: 'CERRADO' })
        .expect(200);
      const lista = await a.http().get('/api/acopios').expect(200);
      expect((lista.body as { id: string }[]).map((x) => x.id)).not.toContain(r.body.id);
      await a.http().get(`/api/acopios/${r.body.id}`).expect(404);
    });

    it('?abiertoAhora=true deja fuera un acopio sin horario', async () => {
      const r = await a
        .http()
        .post('/api/acopios')
        .set(comoAdmin())
        .send(nuevo({ horario: { dom: [], lun: [], mar: [], mie: [], jue: [], vie: [], sab: [] } }))
        .expect(201);
      const abiertos = await a.http().get('/api/acopios?abiertoAhora=true').expect(200);
      expect((abiertos.body as { id: string }[]).map((x) => x.id)).not.toContain(r.body.id);
      const todos = await a.http().get('/api/acopios').expect(200);
      expect((todos.body as { id: string }[]).map((x) => x.id)).toContain(r.body.id);
    });

    it('?cerca= ordena por distancia y ?cerca= mal escrito da 400', async () => {
      const r = await a.http().get('/api/acopios?cerca=4.70,-74.05').expect(200);
      const ids = (r.body as { id: string }[]).map((x) => x.id);
      expect(ids.indexOf(ACOPIO_B)).toBeLessThan(ids.indexOf(ACOPIO_A));
      await a.http().get('/api/acopios?cerca=abc').expect(400);
      await a.http().get('/api/acopios?cerca=200,5').expect(400);
    });

    describe('operación por el Operador asignado (B-03)', () => {
      let op: { token: string };
      const comoOp = () => ({ authorization: `Bearer ${op.token}` });

      beforeAll(async () => {
        op = await crearUsuarioActivo(a, tokenAdmin, {
          rol: 'OPERADOR',
          asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
        });
      });

      it('pausa su acopio; queda PAUSADO en lo público y en la bitácora', async () => {
        await a
          .http()
          .patch(`/api/acopios/${ACOPIO_A}/operacion`)
          .set(comoOp())
          .send({ estado: 'PAUSADO', indicacionesAcceso: 'Entrar por la puerta lateral' })
          .expect(200);
        const r = await a.http().get(`/api/acopios/${ACOPIO_A}`).expect(200);
        expect(r.body).toMatchObject({
          estado: 'PAUSADO',
          indicacionesAcceso: 'Entrar por la puerta lateral',
        });
        const b = await a.prisma.bitacora.findFirst({
          where: { entidad_id: ACOPIO_A, accion: 'acopio.operado' },
          orderBy: { ocurrido_en: 'desc' },
        });
        expect(b?.ubicacion_id).toBe(ACOPIO_A);
        await a
          .http()
          .patch(`/api/acopios/${ACOPIO_A}/operacion`)
          .set(comoOp())
          .send({ estado: 'ACTIVO' })
          .expect(200);
      });

      it('con un acopio ajeno recibe 403', async () => {
        await a
          .http()
          .patch(`/api/acopios/${ACOPIO_B}/operacion`)
          .set(comoOp())
          .send({ estado: 'PAUSADO' })
          .expect(403);
      });

      it('no puede usar la ruta del Administrador ni cerrar por la de operación', async () => {
        await a
          .http()
          .patch(`/api/acopios/${ACOPIO_A}`)
          .set(comoOp())
          .send({ nombre: 'Otro' })
          .expect(403);
        await a
          .http()
          .patch(`/api/acopios/${ACOPIO_A}/operacion`)
          .set(comoOp())
          .send({ estado: 'CERRADO' })
          .expect(400);
        const r = await a.http().get(`/api/acopios/${ACOPIO_A}`).expect(200);
        expect(r.body).toMatchObject({ nombre: 'Acopio A', estado: 'ACTIVO' });
      });

      it('en la gestión ve solo los suyos; el Administrador ve todos, cerrados incluidos', async () => {
        const suyos = await a.http().get('/api/acopios/gestion').set(comoOp()).expect(200);
        expect((suyos.body as { id: string }[]).map((x) => x.id)).toEqual([ACOPIO_A]);
        const todos = await a.http().get('/api/acopios/gestion').set(comoAdmin()).expect(200);
        expect((todos.body as { estado: string }[]).some((x) => x.estado === 'CERRADO')).toBe(true);
      });
    });
  });

  describe('zonas (RF-MOT-001)', () => {
    const nueva = (emergenciaId: string) => ({
      emergenciaId,
      nombre: unico('Vereda '),
      municipio: 'Soacha',
      lat: 4.58,
      lng: -74.21,
      poblacionEstimada: 340,
      poblacionFuente: 'Junta de acción comunal',
      poblacionFecha: '2026-09-20',
    });

    it('el Administrador crea una zona y la lista por emergencia', async () => {
      const r = await a
        .http()
        .post('/api/zonas')
        .set(comoAdmin())
        .send(nueva(EMERGENCIA_PRUEBA))
        .expect(201);
      expect(r.body).toMatchObject({ estado: 'SIN_ATENDER', poblacionEstimada: 340 });
      const lista = await a
        .http()
        .get(`/api/zonas?emergencia=${EMERGENCIA_PRUEBA}`)
        .set(comoAdmin())
        .expect(200);
      expect((lista.body as { id: string }[]).map((z) => z.id)).toContain(r.body.id);
    });

    it('con la emergencia cerrada, la zona queda en solo lectura: 409', async () => {
      const e = await a
        .http()
        .post('/api/emergencias')
        .set(comoAdmin())
        .send({
          nombre: unico('Sismo '),
          tipo: 'Sismo',
          inicio: '2026-09-01',
          destacadaHasta: '2099-01-01',
        })
        .expect(201);
      const zona = await a
        .http()
        .post('/api/zonas')
        .set(comoAdmin())
        .send(nueva(e.body.id))
        .expect(201);
      await a
        .http()
        .post(`/api/emergencias/${e.body.id}/cerrar`)
        .set(comoAdmin())
        .send({ motivo: 'Atención terminada en la zona' })
        .expect(201);
      const r = await a
        .http()
        .patch(`/api/zonas/${zona.body.id}`)
        .set(comoAdmin())
        .send({ estado: 'CUBIERTA' })
        .expect(409);
      expect(r.body.codigo).toBe('ZONA_SOLO_LECTURA');
      await a.http().post('/api/zonas').set(comoAdmin()).send(nueva(e.body.id)).expect(409);
    });
  });
});
