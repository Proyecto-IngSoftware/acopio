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

type Usuario = Awaited<ReturnType<typeof crearUsuarioActivo>>;
type Preparada = {
  folio: string;
  lineas: { id: string; categoriaId: string }[];
  donadorToken: string;
};

describe('recibir una donación preparada (RF-CMP-001C)', () => {
  let a: AppPrueba;
  let opA: Usuario;
  let opA2: Usuario;
  let opB: Usuario;
  let unidades: string;
  let perecedera: string;
  let agua: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    const admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    opA = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
    opA2 = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
    opB = await crearUsuarioActivo(a, admin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_B }],
    });
    const cat = (where: object) =>
      a.prisma.categoria.findFirstOrThrow({ where: { archivada: false, ...where } });
    unidades = (await cat({ perecedero: false, unidad_base: 'UNIDAD' })).id;
    perecedera = (await cat({ perecedero: true })).id;
    agua = (await cat({ perecedero: false, unidad_base: 'LITRO' })).id;
    await a.prisma.codigoBarras.upsert({
      where: { ean: '7702001045231' },
      update: { categoria_id: agua, contenido: 0.6 },
      create: { ean: '7702001045231', categoria_id: agua, contenido: 0.6, creado_por: opA.id },
    });
  });
  afterAll(() => a.cerrar());

  // Cada donación sale de un Donador nuevo: PREPARADAS_MAXIMO limita las abiertas por Donador
  const preparar = async (acopioId = ACOPIO_A): Promise<Preparada> => {
    const donador = await crearDonador(a);
    const r = await a
      .http()
      .post('/api/donaciones')
      .set('authorization', `Bearer ${donador.token}`)
      .send({
        acopioId,
        lineas: [
          { categoriaId: unidades, cantidad: 10 },
          { categoriaId: agua, ean: '7702001045231', cantidad: 12 },
          { categoriaId: perecedera, cantidad: 3 },
        ],
      })
      .expect(201);
    return { ...r.body, donadorToken: donador.token };
  };
  const recibir = (token: string, folio: string, cuerpo: object) =>
    a
      .http()
      .post(`/api/comprobantes/${folio}/recepcion`)
      .set('authorization', `Bearer ${token}`)
      .send(cuerpo);
  // Las cantidades van en el orden unidades, agua, perecedera; las líneas vuelven ordenadas por id
  const confirmar = (d: Preparada, cantidades: number[], venceEn: string | null = '2027-01-31') =>
    d.lineas.map((l) => ({
      lineaId: l.id,
      cantidadConfirmada: cantidades[[unidades, agua, perecedera].indexOf(l.categoriaId)],
      venceEn: venceEn ?? undefined,
    }));
  const vinculosDe = (folio: string) =>
    a.prisma.comprobanteMovimiento.findMany({
      where: { comprobante: { folio } },
      include: { movimiento: true },
    });

  it('crea las entradas en unidad base, las vincula y pasa a PENDIENTE', async () => {
    const d = await preparar();
    const r = await recibir(opA.token, d.folio, {
      acopioId: ACOPIO_A,
      lineas: confirmar(d, [10, 12, 2]),
    }).expect(200);
    expect(r.body.comprobante.estado).toBe('PENDIENTE');
    const vinculos = await vinculosDe(d.folio);
    const porCategoria = Object.fromEntries(
      vinculos.map((v) => [v.movimiento.categoria_id, Number(v.movimiento.cantidad)]),
    );
    // 12 botellas de 0,6 L entran como 7,2 L
    expect(porCategoria).toEqual({ [unidades]: 10, [agua]: 7.2, [perecedera]: 2 });
    expect(vinculos.every((v) => v.origen === 'RECEPCION')).toBe(true);
  });

  it('una línea confirmada en cero no crea movimiento', async () => {
    const d = await preparar();
    await recibir(opA.token, d.folio, {
      acopioId: ACOPIO_A,
      lineas: confirmar(d, [10, 0, 3]),
    }).expect(200);
    expect(await vinculosDe(d.folio)).toHaveLength(2);
  });

  it('una perecedera sin vencimiento no deja recibir y no crea nada', async () => {
    const d = await preparar();
    const r = await recibir(opA.token, d.folio, {
      acopioId: ACOPIO_A,
      lineas: confirmar(d, [10, 12, 3], null),
    }).expect(422);
    expect(r.body.codigo).toBe('VENCIMIENTO_REQUERIDO');
    expect(await vinculosDe(d.folio)).toHaveLength(0);
    expect(
      (await a.prisma.comprobante.findUniqueOrThrow({ where: { folio: d.folio } })).estado,
    ).toBe('PREPARADO');
  });

  it('se recibe donde llegó aunque se preparara para otro acopio, destacado en la bitácora', async () => {
    const d = await preparar(ACOPIO_A);
    await a.prisma.noRecibir.create({
      data: { acopio_id: ACOPIO_B, categoria_id: agua, marcado_por: opB.id },
    });
    try {
      const r = await recibir(opB.token, d.folio, {
        acopioId: ACOPIO_B,
        lineas: confirmar(d, [10, 12, 3]),
      }).expect(200);
      expect(r.body.comprobante.acopio.id).toBe(ACOPIO_B);
      expect(r.body.noRecibe).toEqual([agua]);
      const evento = await a.prisma.bitacora.findFirstOrThrow({
        where: {
          accion: 'comprobante.recibido',
          entidad_id: (await a.prisma.comprobante.findUniqueOrThrow({ where: { folio: d.folio } }))
            .id,
        },
      });
      expect(evento.destacado).toBe(true);
    } finally {
      await a.prisma.noRecibir.deleteMany({ where: { acopio_id: ACOPIO_B } });
    }
  });

  it('dos Operadores con el mismo folio a la vez: una recepción y un juego de entradas', async () => {
    const d = await preparar();
    const cuerpo = { acopioId: ACOPIO_A, lineas: confirmar(d, [10, 12, 3]) };
    const [x, y] = await Promise.all([
      recibir(opA.token, d.folio, cuerpo),
      recibir(opA2.token, d.folio, cuerpo),
    ]);
    expect([x.status, y.status].sort()).toEqual([200, 409]);
    expect(await vinculosDe(d.folio)).toHaveLength(3);
  });

  it('una donación ya recibida no se recibe otra vez', async () => {
    const d = await preparar();
    await recibir(opA.token, d.folio, {
      acopioId: ACOPIO_A,
      lineas: confirmar(d, [1, 1, 1]),
    }).expect(200);
    const r = await recibir(opA.token, d.folio, {
      acopioId: ACOPIO_A,
      lineas: confirmar(d, [1, 1, 1]),
    }).expect(409);
    expect(r.body).toMatchObject({ codigo: 'ESTADO_INVALIDO', detalles: { estado: 'PENDIENTE' } });
  });

  it('si falta una línea responde 422 sin tocar nada', async () => {
    const d = await preparar();
    const r = await recibir(opA.token, d.folio, {
      acopioId: ACOPIO_A,
      lineas: confirmar(d, [1, 1, 1]).slice(0, 2),
    }).expect(422);
    expect(r.body.codigo).toBe('LINEAS_INCOMPLETAS');
  });

  it('un Operador solo recibe en el acopio que tiene asignado', async () => {
    const d = await preparar();
    await recibir(opB.token, d.folio, {
      acopioId: ACOPIO_A,
      lineas: confirmar(d, [1, 1, 1]),
    }).expect(403);
  });

  it('el Donador no recibe', async () => {
    const d = await preparar();
    await recibir(d.donadorToken, d.folio, {
      acopioId: ACOPIO_A,
      lineas: confirmar(d, [1, 1, 1]),
    }).expect(403);
  });

  it('cualquier Operador ve lo declarado de un folio', async () => {
    const d = await preparar(ACOPIO_A);
    const r = await a
      .http()
      .get(`/api/comprobantes/${d.folio.toLowerCase()}`)
      .set('authorization', `Bearer ${opB.token}`)
      .expect(200);
    expect(r.body.lineas).toHaveLength(3);
  });

  it('recibir y cancelar a la vez: uno gana, el otro 409, y si cancela no quedan entradas', async () => {
    for (let i = 0; i < 4; i++) {
      const d = await preparar();
      const cuerpo = { acopioId: ACOPIO_A, lineas: confirmar(d, [10, 12, 3]) };
      const [x, y] = await Promise.all([
        recibir(opA.token, d.folio, cuerpo),
        a
          .http()
          .post(`/api/donaciones/${d.folio}/cancelar`)
          .set('authorization', `Bearer ${d.donadorToken}`),
      ]);
      expect([x.status, y.status].sort()).toEqual([200, 409]);
      const estado = (await a.prisma.comprobante.findUniqueOrThrow({ where: { folio: d.folio } }))
        .estado;
      expect(estado).toBe(x.status === 200 ? 'PENDIENTE' : 'CANCELADO');
      expect(await vinculosDe(d.folio)).toHaveLength(x.status === 200 ? 3 : 0);
    }
  });

  it('folios distintos con las mismas categorías, recibidos a la vez, no se bloquean entre sí', async () => {
    const dosLineas = async () => {
      const donador = await crearDonador(a);
      const r = await a
        .http()
        .post('/api/donaciones')
        .set('authorization', `Bearer ${donador.token}`)
        .send({
          acopioId: ACOPIO_A,
          lineas: [
            { categoriaId: unidades, cantidad: 4 },
            { categoriaId: agua, ean: '7702001045231', cantidad: 6 },
          ],
        })
        .expect(201);
      return r.body as Preparada;
    };
    for (let ronda = 0; ronda < 6; ronda++) {
      const [x, y] = [await dosLineas(), await dosLineas()];
      const cuerpo = (d: Preparada) => ({
        acopioId: ACOPIO_A,
        lineas: d.lineas.map((l) => ({ lineaId: l.id, cantidadConfirmada: 1 })),
      });
      const [rx, ry] = await Promise.all([
        recibir(opA.token, x.folio, cuerpo(x)),
        recibir(opA2.token, y.folio, cuerpo(y)),
      ]);
      expect([rx.status, ry.status]).toEqual([200, 200]);
    }
  });
});
