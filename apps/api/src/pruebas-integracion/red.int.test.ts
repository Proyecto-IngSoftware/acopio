import {
  ACOPIO_A,
  ADMIN,
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
});
