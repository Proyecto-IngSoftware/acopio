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
    const admin = await a.prisma.usuario.findFirstOrThrow({ where: { rol: 'ADMIN' } });
    const botella =
      (await a.prisma.presentacion.findFirst({
        where: { categoria_id: agua, nombre: 'Botella 0,6 L donaciones' },
      })) ??
      (await a.prisma.presentacion.create({
        data: {
          categoria_id: agua,
          nombre: 'Botella 0,6 L donaciones',
          tamano: 0.6,
          estado: 'VALIDADO',
          creado_por: admin.id,
        },
      }));
    await a.prisma.codigoBarras.upsert({
      where: { ean: '7702001045231' },
      update: {},
      create: {
        ean: '7702001045231',
        categoria_id: agua,
        presentacion_id: botella.id,
        estado: 'VALIDADO',
        creado_por: admin.id,
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

  it('dos cancelaciones simultáneas dan 200 y 409 y una sola entrada en la bitácora', async () => {
    const otro = await crearDonador(a);
    const c = await como(otro.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_A,
        lineas: [{ categoriaId: arroz, cantidad: 1 }],
      })
      .expect(201);
    const rs = await Promise.all([
      como(otro.token).post(`/api/donaciones/${c.body.folio}/cancelar`),
      como(otro.token).post(`/api/donaciones/${c.body.folio}/cancelar`),
    ]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    const eventos = await a.prisma.bitacora.count({
      where: { accion: 'comprobante.cancelado', usuario_id: otro.id },
    });
    expect(eventos).toBe(1);
  });

  it('no cancela una donación que ya dejó de estar preparada', async () => {
    const otro = await crearDonador(a);
    const c = await como(otro.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_A,
        lineas: [{ categoriaId: arroz, cantidad: 1 }],
      })
      .expect(201);
    await a.prisma.comprobante.update({
      where: { folio: c.body.folio },
      data: { estado: 'PENDIENTE' },
    });
    await como(otro.token).post(`/api/donaciones/${c.body.folio}/cancelar`).expect(409);
    const fila = await a.prisma.comprobante.findUniqueOrThrow({ where: { folio: c.body.folio } });
    expect(fila.estado).toBe('PENDIENTE');
  });

  it('valida el filtro de estado al listar', async () => {
    const otro = await crearDonador(a);
    await como(otro.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_A,
        lineas: [{ categoriaId: arroz, cantidad: 1 }],
      })
      .expect(201);
    await como(otro.token).get('/api/donaciones?estado=XYZ').expect(400);
    const prep = await como(otro.token).get('/api/donaciones?estado=PREPARADO').expect(200);
    expect(prep.body).toHaveLength(1);
    const canc = await como(otro.token).get('/api/donaciones?estado=CANCELADO').expect(200);
    expect(canc.body).toHaveLength(0);
  });

  it('con un código conocido la cantidad de presentaciones es entera', async () => {
    const r = await como(donador.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_A,
        lineas: [{ categoriaId: agua, ean: '7702001045231', cantidad: 12.5 }],
      })
      .expect(422);
    expect(r.body.codigo).toBe('CANTIDAD_ENTERA');
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

  describe('el Donador propone (ADR-0021)', () => {
    const ean = `77${Date.now().toString().slice(-11)}`;
    let presentacionId: string;

    it('propone un EAN con una presentación nueva y la donación usa su tamaño', async () => {
      const r = await como(donador.token)
        .post('/api/donaciones/codigos', {
          ean,
          presentacionNueva: {
            categoriaId: agua,
            nombre: `Botella 0,6 L propuesta ${ean}`,
            tamano: 0.6,
          },
        })
        .expect(201);
      expect(r.body).toMatchObject({
        ean,
        categoriaId: agua,
        estado: 'PROPUESTO',
        contenido: 0.6,
        presentacion: { tamano: 0.6 },
      });
      expect(r.body.creadoPor).toBeUndefined();
      presentacionId = r.body.presentacion.id as string;
      const p = await a.prisma.presentacion.findUniqueOrThrow({ where: { id: presentacionId } });
      expect(p.estado).toBe('PROPUESTO');
      const d = await como(donador.token)
        .post('/api/donaciones', {
          acopioId: ACOPIO_A,
          lineas: [{ categoriaId: agua, ean, cantidad: 24 }],
        })
        .expect(201);
      expect(d.body.lineas[0]).toMatchObject({ contenidoUnitario: 0.6, cantidadDeclarada: 24 });
      const g = await como(donador.token).get(`/api/donaciones/codigos/${ean}`).expect(200);
      expect(g.body).toMatchObject({ estado: 'PROPUESTO', presentacion: { id: presentacionId } });
    });

    it('un segundo Donador propone el mismo EAN y recibe el código del primero', async () => {
      const otro = await crearDonador(a);
      const r = await como(otro.token)
        .post('/api/donaciones/codigos', { ean, presentacionId })
        .expect(201);
      expect(r.body).toMatchObject({
        ean,
        estado: 'PROPUESTO',
        presentacion: { id: presentacionId },
      });
      const g = await como(otro.token).get(`/api/donaciones/codigos/${ean}`).expect(200);
      expect(g.body.estado).toBe('PROPUESTO');
    });

    it.each([
      ['nombres distintos', false],
      ['el mismo nombre', true],
    ])('dos Donadores proponen a la vez el mismo EAN nuevo (%s): ambos 201', async (_n, igual) => {
      const nuevo = `79${Math.floor(Math.random() * 1e11)
        .toString()
        .padStart(11, '0')}`;
      const otro = await crearDonador(a);
      const propone = (token: string, i: number) =>
        como(token).post('/api/donaciones/codigos', {
          ean: nuevo,
          presentacionNueva: {
            categoriaId: agua,
            nombre: igual ? `Carrera ${nuevo}` : `Carrera ${nuevo} ${i}`,
            tamano: 0.5,
          },
        });
      const [r1, r2] = await Promise.all([propone(donador.token, 1), propone(otro.token, 2)]);
      expect([r1.status, r2.status]).toEqual([201, 201]);
      expect(r1.body.ean).toBe(nuevo);
      expect(r2.body.presentacion.id).toBe(r1.body.presentacion.id);
    });

    it('el Operador lo ve PROPUESTO', async () => {
      const admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
      const r = await a
        .http()
        .get(`/api/codigos-barras/${ean}`)
        .set('authorization', `Bearer ${admin}`)
        .expect(200);
      expect(r.body.estado).toBe('PROPUESTO');
    });

    it('una línea de más de 10.000 L responde 422 CANTIDAD_FUERA_DE_TOPE', async () => {
      const suelta = await como(donador.token)
        .post('/api/donaciones/codigos', {
          ean: `78${Date.now().toString().slice(-11)}`,
          presentacionNueva: {
            categoriaId: agua,
            nombre: `Paca x12 ${ean}`,
            contieneId: presentacionId,
            unidades: 12,
          },
        })
        .expect(201);
      const r = await como(donador.token)
        .post('/api/donaciones', {
          acopioId: ACOPIO_A,
          lineas: [{ categoriaId: agua, ean: suelta.body.ean, cantidad: 20_000 }],
        })
        .expect(422);
      expect(r.body.codigo).toBe('CANTIDAD_FUERA_DE_TOPE');
      expect(r.body.mensaje).toContain('10.000');
    });
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

describe('proponer códigos con el límite por IP', () => {
  it('la undécima propuesta del minuto recibe 429', async () => {
    const b = await crearAppPrueba({ limiteDeIntentos: true });
    try {
      const donador = await crearDonador(b);
      const proponer = () =>
        b
          .http()
          .post('/api/donaciones/codigos')
          .set('authorization', `Bearer ${donador.token}`)
          .send({});
      // Un cuerpo vacío no crea nada: 400, pero el intento cuenta
      for (let i = 0; i < 10; i++) await proponer().expect(400);
      await proponer().expect(429);
    } finally {
      await b.cerrar();
    }
  });
});
