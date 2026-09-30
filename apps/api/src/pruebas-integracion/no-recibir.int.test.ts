import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-INV-008, adelantado al Bloque 1 (B-02). */
describe('no recibir', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  let op: { token: string };
  let ropa: string;
  const comoOp = () => ({ authorization: `Bearer ${op.token}` });
  const ruta = (acopio: string, categoria: string) =>
    `/api/acopios/${acopio}/no-recibir/${categoria}`;

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    op = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    const cat = await a.prisma.categoria.findFirstOrThrow({
      where: { grupo: 'ROPA_Y_ABRIGO', archivada: false },
    });
    ropa = cat.id;
  });
  afterAll(() => a.cerrar());

  it('el Operador marca «no recibir» y se publica de inmediato', async () => {
    await a
      .http()
      .put(ruta(ACOPIO_A, ropa))
      .set(comoOp())
      .send({ hasta: '2099-01-01' })
      .expect(200);
    const r = await a.http().get(`/api/acopios/${ACOPIO_A}/no-recibir`).expect(200);
    expect(r.body).toEqual([expect.objectContaining({ categoriaId: ropa, hasta: '2099-01-01' })]);
    const filtro = await a.http().get(`/api/no-recibir?categoria=${ropa}`).expect(200);
    expect((filtro.body as { acopioId: string }[]).map((x) => x.acopioId)).toContain(ACOPIO_A);
    const b = await a.prisma.bitacora.findFirst({
      where: { accion: 'no_recibir.marcado', ubicacion_id: ACOPIO_A },
    });
    expect(b).not.toBeNull();
  });

  it('una marca vencida no cuenta', async () => {
    await a.prisma.noRecibir.update({
      where: { acopio_id_categoria_id: { acopio_id: ACOPIO_A, categoria_id: ropa } },
      data: { hasta: new Date('2020-01-01T00:00:00Z') },
    });
    const r = await a.http().get(`/api/acopios/${ACOPIO_A}/no-recibir`).expect(200);
    expect(r.body).toEqual([]);
    const filtro = await a.http().get(`/api/no-recibir?categoria=${ropa}`).expect(200);
    expect((filtro.body as { acopioId: string }[]).map((x) => x.acopioId)).not.toContain(ACOPIO_A);
  });

  it('desmarcar la quita', async () => {
    await a.http().put(ruta(ACOPIO_A, ropa)).set(comoOp()).send({}).expect(200);
    await a.http().delete(ruta(ACOPIO_A, ropa)).set(comoOp()).expect(204);
    const r = await a.http().get(`/api/acopios/${ACOPIO_A}/no-recibir`).expect(200);
    expect(r.body).toEqual([]);
  });

  it('con un acopio ajeno: 403', async () => {
    await a.http().put(ruta(ACOPIO_B, ropa)).set(comoOp()).send({}).expect(403);
  });

  it('hasta en el pasado: 422', async () => {
    const r = await a
      .http()
      .put(ruta(ACOPIO_A, ropa))
      .set(comoOp())
      .send({ hasta: '2020-01-01' })
      .expect(422);
    expect(r.body.codigo).toBe('FECHA_PASADA');
  });

  it('categoría archivada: 404; acopio cerrado: 409', async () => {
    const archivada = await a.prisma.categoria.create({
      data: {
        nombre: `Archivada ${Date.now()}`,
        grupo: 'HERRAMIENTAS',
        unidad_base: 'UNIDAD',
        archivada: true,
      },
    });
    await a.http().put(ruta(ACOPIO_A, archivada.id)).set(comoOp()).send({}).expect(404);
    await a.prisma.acopio.update({ where: { id: ACOPIO_B }, data: { estado: 'CERRADO' } });
    const r = await a
      .http()
      .put(ruta(ACOPIO_B, ropa))
      .set({ authorization: `Bearer ${tokenAdmin}` })
      .send({})
      .expect(409);
    expect(r.body.codigo).toBe('ACOPIO_CERRADO');
  });
});
