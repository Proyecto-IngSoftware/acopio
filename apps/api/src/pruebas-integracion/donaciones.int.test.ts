import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  crearAppPrueba,
  crearDonador,
  crearUsuarioActivo,
  iniciarSesion,
  type AppPrueba,
} from '../../test/app-prueba';

describe('preparar una donación (RF-CMP-001B)', () => {
  let a: AppPrueba;
  let donador: Awaited<ReturnType<typeof crearDonador>>;
  let arroz: string;
  let agua: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    donador = await crearDonador(a);
    arroz = (await a.prisma.categoria.findFirstOrThrow({ where: { nombre: 'Arroz' } })).id;
    agua = (await a.prisma.categoria.findFirstOrThrow({ where: { nombre: 'Agua potable' } })).id;
    await a.prisma.codigoBarras.upsert({
      where: { ean: '7702001045231' },
      update: {},
      create: {
        ean: '7702001045231',
        categoria_id: agua,
        contenido: 0.6,
        creado_por: (await a.prisma.usuario.findFirstOrThrow({ where: { rol: 'ADMIN' } })).id,
      },
    });
  });
  afterAll(() => a.cerrar());

  const como = (token: string) => ({
    get: (r: string) => a.http().get(r).set('authorization', `Bearer ${token}`),
    post: (r: string, cuerpo?: object) =>
      a.http().post(r).set('authorization', `Bearer ${token}`).send(cuerpo),
  });

  it('crea una donación PREPARADO con folio y copia el contenido del código', async () => {
    const r = await como(donador.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_A,
        lineas: [
          { categoriaId: arroz, cantidad: 5 },
          { categoriaId: agua, ean: '7702001045231', cantidad: 12 },
        ],
      })
      .expect(201);
    expect(r.body.folio).toMatch(/^ACO-\d{4}-[A-HJ-NP-Z2-9]{5}$/);
    expect(r.body.estado).toBe('PREPARADO');
    const botellas = r.body.lineas.find((l: { ean: string | null }) => l.ean);
    expect(botellas).toMatchObject({ contenidoUnitario: 0.6, cantidadDeclarada: 12 });
  });

  it('un código desconocido se guarda sin ean: el Donador no enseña códigos', async () => {
    const r = await como(donador.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_A,
        lineas: [{ categoriaId: arroz, ean: '0000000000000', cantidad: 1 }],
      })
      .expect(201);
    expect(r.body.lineas[0]).toMatchObject({ ean: null, contenidoUnitario: 1 });
  });

  it('un código de otra categoría no se acepta', async () => {
    const r = await como(donador.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_A,
        lineas: [{ categoriaId: arroz, ean: '7702001045231', cantidad: 1 }],
      })
      .expect(422);
    expect(r.body.codigo).toBe('CODIGO_NO_COINCIDE');
  });

  it('con 5 preparadas no deja preparar otra', async () => {
    const otro = await crearDonador(a);
    for (let i = 0; i < 5; i++) {
      await como(otro.token)
        .post('/api/donaciones', {
          acopioId: ACOPIO_B,
          lineas: [{ categoriaId: arroz, cantidad: 1 }],
        })
        .expect(201);
    }
    const r = await como(otro.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_B,
        lineas: [{ categoriaId: arroz, cantidad: 1 }],
      })
      .expect(409);
    expect(r.body.codigo).toBe('LIMITE_PREPARADAS');
  });

  it('lista solo las suyas y cancela una preparada', async () => {
    const otro = await crearDonador(a);
    const creada = await como(otro.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_A,
        lineas: [{ categoriaId: arroz, cantidad: 2 }],
      })
      .expect(201);
    const lista = await como(otro.token).get('/api/donaciones').expect(200);
    expect(lista.body.map((d: { folio: string }) => d.folio)).toEqual([creada.body.folio]);

    await como(donador.token).post(`/api/donaciones/${creada.body.folio}/cancelar`).expect(404);
    const cancelada = await como(otro.token)
      .post(`/api/donaciones/${creada.body.folio.toLowerCase()}/cancelar`)
      .expect(200);
    expect(cancelada.body.estado).toBe('CANCELADO');
    await como(otro.token).post(`/api/donaciones/${creada.body.folio}/cancelar`).expect(409);
  });

  it('sugiere dónde entregar y avisa qué no recibe cada acopio', async () => {
    await a.prisma.noRecibir.create({
      data: { acopio_id: ACOPIO_A, categoria_id: agua, marcado_por: donador.id },
    });
    const r = await como(donador.token)
      .post('/api/donaciones/sugerencias', {
        lineas: [{ categoriaId: arroz }, { categoriaId: agua }],
      })
      .expect(200);
    const primero = r.body[0];
    expect(primero.acopioId).toBe(ACOPIO_B);
    expect(r.body.find((s: { acopioId: string }) => s.acopioId === ACOPIO_A).noRecibe).toEqual([
      agua,
    ]);
    await a.prisma.noRecibir.deleteMany({ where: { acopio_id: ACOPIO_A } });
  });

  it('consulta un código sin saber quién lo asoció', async () => {
    const r = await como(donador.token).get('/api/donaciones/codigos/7702001045231').expect(200);
    expect(r.body).toMatchObject({ categoria: 'Agua potable', contenido: 0.6 });
    expect(r.body.creadoPor).toBeUndefined();
    await como(donador.token).get('/api/donaciones/codigos/0000000000000').expect(404);
  });

  it('un Operador no prepara donaciones', async () => {
    const admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    const op = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
    await como(op.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_A,
        lineas: [{ categoriaId: arroz, cantidad: 1 }],
      })
      .expect(403);
  });
});
