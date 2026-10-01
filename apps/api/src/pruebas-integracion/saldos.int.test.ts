import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  ZONA_A,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-INV-005 y RF-INV-006. */
describe('saldos e historial', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  let op: { token: string };
  let auditor: { token: string };
  let receptor: { token: string };
  let arroz: string;
  let manta: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    op = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    auditor = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'AUDITOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_B }],
    });
    receptor = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'RECEPTOR',
      asignaciones: [{ tipo: 'ZONA', ubicacionId: ZONA_A }],
    });
    arroz = (
      await a.prisma.categoria.create({
        data: {
          nombre: unico('Arroz saldo '),
          grupo: 'ALIMENTOS',
          unidad_base: 'KILOGRAMO',
          perecedero: true,
        },
      })
    ).id;
    manta = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Manta saldo '), grupo: 'ROPA_Y_ABRIGO', unidad_base: 'UNIDAD' },
      })
    ).id;
    const post = (ruta: string, datos: object) =>
      a.http().post(`/api/acopios/${ACOPIO_A}/${ruta}`).set(como(op.token)).send(datos).expect(201);
    await post('entradas', { categoriaId: arroz, cantidad: 40, venceEn: '2026-10-12' });
    await post('entradas', { categoriaId: arroz, cantidad: 80, venceEn: '2026-10-30' });
    await post('salidas', { categoriaId: arroz, cantidad: 50, motivoSalida: 'ENTREGA_FAMILIAS' });
    await post('entradas', { categoriaId: manta, cantidad: 30 });
  });
  afterAll(() => a.cerrar());

  it('saldos por categoría con vencimiento estimado y «Sin umbral»', async () => {
    const r = await a.http().get(`/api/acopios/${ACOPIO_A}/saldos`).set(como(op.token)).expect(200);
    const fila = (r.body as { categoriaId: string }[]).find((x) => x.categoriaId === arroz);
    expect(fila).toMatchObject({
      cantidad: 70,
      unidad: 'KILOGRAMO',
      perecedero: true,
      umbral: null,
      semaforo: 'SIN_UMBRAL',
      vencimientos: [{ venceEn: '2026-10-30', cantidad: 70 }],
    });
    expect(typeof (fila as { ultimoMovimiento: string }).ultimoMovimiento).toBe('string');
    const mantas = (r.body as { categoriaId: string; vencimientos: unknown[] }[]).find(
      (x) => x.categoriaId === manta,
    );
    expect(mantas!.vencimientos).toEqual([]);
  });

  it('una categoría con umbral y saldo cero también aparece', async () => {
    const vacia = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Vacía saldo '), grupo: 'SALUD', unidad_base: 'UNIDAD' },
      })
    ).id;
    const admin = await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } });
    await a.prisma.umbral.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: vacia,
        minimo: 5,
        maximo: 20,
        actualizado_por: admin.id,
      },
    });
    const r = await a.http().get(`/api/acopios/${ACOPIO_A}/saldos`).set(como(op.token)).expect(200);
    expect(
      (r.body as { categoriaId: string }[]).find((x) => x.categoriaId === vacia),
    ).toMatchObject({
      cantidad: 0,
      umbral: { minimo: 5, maximo: 20 },
      semaforo: 'BAJO',
      ultimoMovimiento: null,
    });
  });

  it('el Auditor y el Administrador leen cualquier acopio; un Receptor no', async () => {
    await a.http().get(`/api/acopios/${ACOPIO_A}/saldos`).set(como(auditor.token)).expect(200);
    await a.http().get(`/api/acopios/${ACOPIO_A}/saldos`).set(como(tokenAdmin)).expect(200);
    await a.http().get(`/api/acopios/${ACOPIO_A}/saldos`).set(como(receptor.token)).expect(403);
  });

  it('un Operador de otro acopio no lee: 403', async () => {
    await a.http().get(`/api/acopios/${ACOPIO_B}/saldos`).set(como(op.token)).expect(403);
  });

  it('el historial explica el saldo, del más reciente al más viejo', async () => {
    const r = await a
      .http()
      .get(`/api/acopios/${ACOPIO_A}/movimientos?categoriaId=${arroz}`)
      .set(como(auditor.token))
      .expect(200);
    const filas = r.body.filas as {
      tipo: string;
      cantidad: number;
      saldoDespues: number;
      usuario: string;
    }[];
    expect(filas.map((f) => [f.tipo, f.cantidad, f.saldoDespues])).toEqual([
      ['SALIDA', 50, 70],
      ['ENTRADA', 80, 120],
      ['ENTRADA', 40, 40],
    ]);
    expect(filas[0]!.usuario).toMatch(/Persona/);
    expect(r.body.siguiente).toBeNull();
  });

  it('el historial pagina con cursor', async () => {
    const primera = await a
      .http()
      .get(`/api/acopios/${ACOPIO_A}/movimientos?categoriaId=${arroz}&limite=2`)
      .set(como(op.token))
      .expect(200);
    expect(primera.body.filas).toHaveLength(2);
    expect(primera.body.siguiente).toEqual(expect.any(String));
    const segunda = await a
      .http()
      .get(
        `/api/acopios/${ACOPIO_A}/movimientos?categoriaId=${arroz}&limite=2&cursor=${encodeURIComponent(primera.body.siguiente)}`,
      )
      .set(como(op.token))
      .expect(200);
    expect(segunda.body.filas.map((f: { saldoDespues: number }) => f.saldoDespues)).toEqual([40]);
    expect(segunda.body.siguiente).toBeNull();
  });

  it('un cursor mal formado: 400', async () => {
    await a
      .http()
      .get(`/api/acopios/${ACOPIO_A}/movimientos?categoriaId=${arroz}&cursor=basura`)
      .set(como(op.token))
      .expect(400);
  });
});
