import {
  ACOPIO_A,
  ADMIN,
  crearAppPrueba,
  crearDonador,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** ADR-0021: presentaciones sueltas y paquetes. */
describe('presentaciones', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  let op: { token: string };
  let aguaId: string;
  let panalId: string;
  let suelta: string;
  let paquete: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const nombre = unico('Botella ');

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    op = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    aguaId = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Agua P '), grupo: 'AGUA_Y_BEBIDAS', unidad_base: 'LITRO' },
      })
    ).id;
    panalId = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Pañal P '), grupo: 'ADULTO_MAYOR', unidad_base: 'UNIDAD' },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  const crear = (cuerpo: object, token = op.token) =>
    a.http().post('/api/presentaciones').set(como(token)).send(cuerpo);

  it('una suelta de 0,6 L y un paquete de 12: el GET calcula 7,2 L', async () => {
    const s = await crear({ categoriaId: aguaId, nombre, tamano: 0.6 }).expect(201);
    suelta = s.body.id as string;
    expect(s.body).toMatchObject({ clase: 'SUELTA', tamano: 0.6, estado: 'VALIDADO', codigos: 0 });
    const p = await crear({
      categoriaId: aguaId,
      nombre: unico('Paca '),
      contieneId: suelta,
      unidades: 12,
    }).expect(201);
    paquete = p.body.id as string;
    const g = await a
      .http()
      .get(`/api/presentaciones?categoriaId=${aguaId}`)
      .set(como(op.token))
      .expect(200);
    const fila = (g.body as { id: string }[]).find((x) => x.id === paquete);
    expect(fila).toMatchObject({
      clase: 'PAQUETE',
      tamano: 7.2,
      contieneId: suelta,
      unidades: 12,
      unidad: 'LITRO',
    });
  });

  it('el mismo nombre con otras mayúsculas: 409', async () => {
    const r = await crear({ categoriaId: aguaId, nombre: nombre.toUpperCase(), tamano: 1 }).expect(
      409,
    );
    expect(r.body.codigo).toBe('PRESENTACION_DUPLICADA');
  });

  it('un paquete que contiene otro paquete: 422', async () => {
    const r = await crear({
      categoriaId: aguaId,
      nombre: unico('Pacas '),
      contieneId: paquete,
      unidades: 2,
    }).expect(422);
    expect(r.body.codigo).toBe('PAQUETE_INVALIDO');
  });

  it('una suelta de 50,001 L: 422', async () => {
    const r = await crear({ categoriaId: aguaId, nombre: unico('Tanque '), tamano: 50.001 }).expect(
      422,
    );
    expect(r.body.codigo).toBe('TAMANO_FUERA_DE_TOPE');
  });

  it('una suelta de 2,5 en una categoría por unidades: 422', async () => {
    const r = await crear({ categoriaId: panalId, nombre: unico('Mitad '), tamano: 2.5 }).expect(
      422,
    );
    expect(r.body.codigo).toBe('CONTENIDO_FRACCIONARIO');
  });

  it('cambiar la suelta a 5 L deja el paquete en 60 L: 422 y todo sigue igual', async () => {
    const r = await a
      .http()
      .patch(`/api/presentaciones/${suelta}`)
      .set(como(tokenAdmin))
      .send({ tamano: 5 })
      .expect(422);
    expect(r.body.codigo).toBe('TAMANO_FUERA_DE_TOPE');
    const fila = await a.prisma.presentacion.findUniqueOrThrow({ where: { id: suelta } });
    expect(Number(fila.tamano)).toBe(0.6);
  });

  it('solo el Administrador edita', async () => {
    await a
      .http()
      .patch(`/api/presentaciones/${suelta}`)
      .set(como(op.token))
      .send({ tamano: 0.5 })
      .expect(403);
  });

  it('cambiar la suelta a 0,5 L: el paquete pasa a 6 L y la bitácora lo nombra', async () => {
    await a
      .http()
      .patch(`/api/presentaciones/${suelta}`)
      .set(como(tokenAdmin))
      .send({ tamano: 0.5 })
      .expect(200);
    const g = await a
      .http()
      .get(`/api/presentaciones?categoriaId=${aguaId}`)
      .set(como(op.token))
      .expect(200);
    expect((g.body as { id: string; tamano: number }[]).find((x) => x.id === paquete)?.tamano).toBe(
      6,
    );
    const b = await a.prisma.bitacora.findFirstOrThrow({
      where: { accion: 'presentacion.editada', entidad_id: suelta },
    });
    expect((b.datos_despues as { paquetesAfectados: string[] }).paquetesAfectados).toContain(
      paquete,
    );
  });

  it('una presentación inexistente: 404', async () => {
    const r = await a
      .http()
      .patch('/api/presentaciones/00000000-0000-4000-8000-000000000000')
      .set(como(tokenAdmin))
      .send({ nombre: 'x' })
      .expect(404);
    expect(r.body.codigo).toBe('PRESENTACION_NO_ENCONTRADA');
  });

  it('el Donador ve las validadas y sus propuestas; el Operador ve todas', async () => {
    const [d1, d2] = [await crearDonador(a), await crearDonador(a)];
    const propuesta = await a.prisma.presentacion.create({
      data: {
        categoria_id: aguaId,
        nombre: unico('Propuesta '),
        tamano: 2,
        estado: 'PROPUESTO',
        creado_por: d1.id,
      },
    });
    const ids = async (token: string) =>
      (
        (
          await a
            .http()
            .get(`/api/presentaciones?categoriaId=${aguaId}`)
            .set(como(token))
            .expect(200)
        ).body as { id: string }[]
      ).map((x) => x.id);
    const vistoPorD1 = await ids(d1.token);
    expect(vistoPorD1).toContain(propuesta.id);
    expect(vistoPorD1).toContain(suelta);
    const vistoPorD2 = await ids(d2.token);
    expect(vistoPorD2).not.toContain(propuesta.id);
    expect(vistoPorD2).toContain(suelta);
    expect(await ids(op.token)).toContain(propuesta.id);
  });
});
