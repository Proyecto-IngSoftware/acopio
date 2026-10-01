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

/** RF-INV-007 (V-03). */
describe('umbrales', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  let op: { token: string };
  let auditor: { token: string };
  let cat: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const ruta = (acopio = ACOPIO_A, categoria = () => cat) =>
    `/api/acopios/${acopio}/umbrales/${categoria()}`;

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    op = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    auditor = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'AUDITOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    cat = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Umbral '), grupo: 'SALUD', unidad_base: 'UNIDAD' },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  it('el Operador fija mínimo y máximo, con bitácora', async () => {
    const r = await a
      .http()
      .put(ruta())
      .set(como(op.token))
      .send({ minimo: 10, maximo: 50 })
      .expect(200);
    expect(r.body).toMatchObject({ categoriaId: cat, minimo: 10, maximo: 50 });
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'umbral.fijado', ubicacion_id: ACOPIO_A },
      }),
    ).not.toBeNull();
  });

  it('el Administrador también fija, en cualquier acopio', async () => {
    await a
      .http()
      .put(ruta(ACOPIO_B))
      .set(como(tokenAdmin))
      .send({ minimo: 0, maximo: 5 })
      .expect(200);
  });

  it('mínimo mayor que máximo: 400', async () => {
    await a.http().put(ruta()).set(como(op.token)).send({ minimo: 60, maximo: 50 }).expect(400);
  });

  it('negativos: 400', async () => {
    await a.http().put(ruta()).set(como(op.token)).send({ minimo: -1, maximo: 5 }).expect(400);
  });

  it('el Auditor y un Operador ajeno no fijan: 403', async () => {
    await a.http().put(ruta()).set(como(auditor.token)).send({ minimo: 1, maximo: 2 }).expect(403);
    await a
      .http()
      .put(ruta(ACOPIO_B))
      .set(como(op.token))
      .send({ minimo: 1, maximo: 2 })
      .expect(403);
  });

  it('quitar el umbral vuelve a «Sin umbral»', async () => {
    await a.http().delete(ruta()).set(como(op.token)).expect(204);
    expect(await a.prisma.umbral.count({ where: { acopio_id: ACOPIO_A, categoria_id: cat } })).toBe(
      0,
    );
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'umbral.quitado', ubicacion_id: ACOPIO_A },
      }),
    ).not.toBeNull();
  });

  it('categoría inexistente: 404', async () => {
    await a
      .http()
      .put(ruta(ACOPIO_A, () => '99999999-9999-4999-8999-999999999999'))
      .set(como(op.token))
      .send({ minimo: 1, maximo: 2 })
      .expect(404);
  });
});
