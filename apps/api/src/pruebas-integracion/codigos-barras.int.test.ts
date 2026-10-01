import {
  ACOPIO_A,
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-CAT-004 y RF-INV-002. */
describe('códigos de barras', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  let op: { token: string };
  let auditor: { token: string };
  let agua: string;
  let otra: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const ean = '7702001043220';

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
    agua = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Agua EAN '), grupo: 'AGUA_Y_BEBIDAS', unidad_base: 'LITRO' },
      })
    ).id;
    otra = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Otra EAN '), grupo: 'AGUA_Y_BEBIDAS', unidad_base: 'LITRO' },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  it('un EAN desconocido: 404', async () => {
    const r = await a.http().get(`/api/codigos-barras/${ean}`).set(como(op.token)).expect(404);
    expect(r.body.codigo).toBe('EAN_DESCONOCIDO');
  });

  it('el Operador lo asocia y queda sin revisar; la segunda vez se reconoce', async () => {
    const r = await a
      .http()
      .post('/api/codigos-barras')
      .set(como(op.token))
      .send({ ean, categoriaId: agua, contenido: 0.6, descripcion: 'Botella 600 ml' })
      .expect(201);
    expect(r.body).toMatchObject({ ean, categoriaId: agua, contenido: 0.6, revisado: false });
    const g = await a.http().get(`/api/codigos-barras/${ean}`).set(como(op.token)).expect(200);
    expect(g.body).toMatchObject({ categoriaId: agua, unidad: 'LITRO', contenido: 0.6 });
  });

  it('asociar otra vez el mismo EAN: 409, sin pisar la asociación', async () => {
    const r = await a
      .http()
      .post('/api/codigos-barras')
      .set(como(op.token))
      .send({ ean, categoriaId: otra })
      .expect(409);
    expect(r.body.codigo).toBe('EAN_YA_ASOCIADO');
    const g = await a.http().get(`/api/codigos-barras/${ean}`).set(como(op.token)).expect(200);
    expect(g.body.categoriaId).toBe(agua);
  });

  it('EAN con letras, de 9 dígitos o contenido 0: 400', async () => {
    for (const malo of ['77020A1043220', '123456789']) {
      await a
        .http()
        .post('/api/codigos-barras')
        .set(como(op.token))
        .send({ ean: malo, categoriaId: agua })
        .expect(400);
    }
    await a
      .http()
      .post('/api/codigos-barras')
      .set(como(op.token))
      .send({ ean: '7702001043237', categoriaId: agua, contenido: 0 })
      .expect(400);
  });

  it('el Administrador lista los sin revisar y los revisa', async () => {
    const l = await a
      .http()
      .get('/api/codigos-barras?revisado=false')
      .set(como(tokenAdmin))
      .expect(200);
    expect((l.body as { ean: string }[]).map((x) => x.ean)).toContain(ean);
    const r = await a
      .http()
      .patch(`/api/codigos-barras/${ean}`)
      .set(como(tokenAdmin))
      .send({ revisado: true, categoriaId: otra })
      .expect(200);
    expect(r.body).toMatchObject({ revisado: true, categoriaId: otra });
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'codigo_barras.editado', entidad_id: ean },
      }),
    ).not.toBeNull();
  });

  it('lo que asocia el Administrador nace revisado', async () => {
    const r = await a
      .http()
      .post('/api/codigos-barras')
      .set(como(tokenAdmin))
      .send({ ean: '7702001043244', categoriaId: agua })
      .expect(201);
    expect(r.body.revisado).toBe(true);
  });

  it('el Operador no lista ni edita; el Auditor no consulta', async () => {
    await a.http().get('/api/codigos-barras').set(como(op.token)).expect(403);
    await a
      .http()
      .patch(`/api/codigos-barras/${ean}`)
      .set(como(op.token))
      .send({ revisado: true })
      .expect(403);
    await a.http().get(`/api/codigos-barras/${ean}`).set(como(auditor.token)).expect(403);
  });
});
