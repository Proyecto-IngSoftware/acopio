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
    const botella =
      (await a.prisma.presentacion.findFirst({
        where: { categoria_id: agua, nombre: 'Botella 0,6 L recepción' },
      })) ??
      (await a.prisma.presentacion.create({
        data: {
          categoria_id: agua,
          nombre: 'Botella 0,6 L recepción',
          tamano: 0.6,
          estado: 'VALIDADO',
          creado_por: opA.id,
        },
      }));
    await a.prisma.codigoBarras.upsert({
      where: { ean: '7702001045231' },
      update: { categoria_id: agua, presentacion_id: botella.id },
      create: {
        ean: '7702001045231',
        categoria_id: agua,
        presentacion_id: botella.id,
        estado: 'VALIDADO',
        creado_por: opA.id,
      },
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

  it('recibir otra vez un folio ya recibido, con líneas incompletas, da 409 y no 422', async () => {
    const d = await preparar();
    await recibir(opA.token, d.folio, {
      acopioId: ACOPIO_A,
      lineas: confirmar(d, [1, 1, 1]),
    }).expect(200);
    const r = await recibir(opA.token, d.folio, {
      acopioId: ACOPIO_A,
      lineas: confirmar(d, [1, 1, 1]).slice(0, 1),
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

  describe('códigos y presentaciones en la recepción', () => {
    const sufijo = () => Math.random().toString(36).slice(2, 8);
    const eanNuevo = () =>
      `77${String(Date.now()).slice(-8)}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;
    const categoriaNueva = (unidad: 'LITRO' | 'KILOGRAMO' | 'UNIDAD' = 'LITRO') =>
      a.prisma.categoria.create({
        data: { nombre: `Rec ${sufijo()}`, grupo: 'ALIMENTOS', unidad_base: unidad },
      });
    const presentacion = (
      categoriaId: string,
      tamano: number,
      estado: 'VALIDADO' | 'PROPUESTO' = 'VALIDADO',
    ) =>
      a.prisma.presentacion.create({
        data: {
          categoria_id: categoriaId,
          nombre: `P ${sufijo()}`,
          tamano,
          estado,
          creado_por: opA.id,
        },
      });
    const codigo = (
      ean: string,
      categoriaId: string,
      presentacionId: string | null,
      estado: 'VALIDADO' | 'PROPUESTO',
    ) =>
      a.prisma.codigoBarras.create({
        data: {
          ean,
          categoria_id: categoriaId,
          presentacion_id: presentacionId,
          estado,
          creado_por: opA.id,
        },
      });
    const donacion = async (categoriaId: string, ean: string | undefined, cantidad: number) => {
      const donador = await crearDonador(a);
      const r = await a
        .http()
        .post('/api/donaciones')
        .set('authorization', `Bearer ${donador.token}`)
        .send({ acopioId: ACOPIO_A, lineas: [{ categoriaId, ean, cantidad }] })
        .expect(201);
      return r.body as { folio: string; lineas: { id: string }[] };
    };
    const saldo = async (categoriaId: string) =>
      Number(
        (
          await a.prisma.saldo.findFirst({
            where: { categoria_id: categoriaId, acopio_id: ACOPIO_A },
          })
        )?.cantidad ?? 0,
      );

    it('un código PROPUESTO sin presentacionId queda VALIDADO', async () => {
      const cat = await categoriaNueva();
      const p = await presentacion(cat.id, 1, 'PROPUESTO');
      const ean = eanNuevo();
      await codigo(ean, cat.id, p.id, 'PROPUESTO');
      const d = await donacion(cat.id, ean, 2);
      await recibir(opA.token, d.folio, {
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: 2 }],
      }).expect(200);
      const c = await a.prisma.codigoBarras.findUniqueOrThrow({ where: { ean } });
      expect(c).toMatchObject({ estado: 'VALIDADO', por_revisar: false });
      expect((await a.prisma.presentacion.findUniqueOrThrow({ where: { id: p.id } })).estado).toBe(
        'VALIDADO',
      );
    });

    it('un PROPUESTO corregido a la bolsa de 6 L queda VALIDADO con esa presentación y suma 12 L', async () => {
      const cat = await categoriaNueva();
      const botella = await presentacion(cat.id, 1, 'PROPUESTO');
      const bolsa = await presentacion(cat.id, 6);
      const ean = eanNuevo();
      await codigo(ean, cat.id, botella.id, 'PROPUESTO');
      const d = await donacion(cat.id, ean, 2);
      await recibir(opA.token, d.folio, {
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: 2, presentacionId: bolsa.id }],
      }).expect(200);
      const c = await a.prisma.codigoBarras.findUniqueOrThrow({ where: { ean } });
      expect(c).toMatchObject({ estado: 'VALIDADO', presentacion_id: bolsa.id });
      const l = await a.prisma.lineaComprobante.findUniqueOrThrow({
        where: { id: d.lineas[0]!.id },
      });
      expect(Number(l.contenido_unitario)).toBe(6);
      expect(await saldo(cat.id)).toBe(12);
    });

    it('un VALIDADO corregido a otra categoría cambia solo la línea y marca el código', async () => {
      const agua2 = await categoriaNueva();
      const jugo = await categoriaNueva();
      const pAgua = await presentacion(agua2.id, 1);
      const pJugo = await presentacion(jugo.id, 0.5);
      const ean = eanNuevo();
      await codigo(ean, agua2.id, pAgua.id, 'VALIDADO');
      const d = await donacion(agua2.id, ean, 4);
      await recibir(opA.token, d.folio, {
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: 4, presentacionId: pJugo.id }],
      }).expect(200);
      const c = await a.prisma.codigoBarras.findUniqueOrThrow({ where: { ean } });
      expect(c).toMatchObject({
        categoria_id: agua2.id,
        presentacion_id: pAgua.id,
        por_revisar: true,
      });
      const l = await a.prisma.lineaComprobante.findUniqueOrThrow({
        where: { id: d.lineas[0]!.id },
      });
      expect(l.categoria_id).toBe(jugo.id);
      expect(Number(l.contenido_unitario)).toBe(0.5);
      expect(await saldo(jugo.id)).toBe(2);
      expect(await saldo(agua2.id)).toBe(0);
      const comprobante = await a.prisma.comprobante.findUniqueOrThrow({
        where: { folio: d.folio },
      });
      const evento = await a.prisma.bitacora.findFirstOrThrow({
        where: { accion: 'comprobante.linea_corregida', entidad_id: comprobante.id },
      });
      expect(evento.datos_antes).toMatchObject({ categoriaId: agua2.id, contenidoUnitario: 1 });
      expect(evento.datos_despues).toMatchObject({ categoriaId: jugo.id, contenidoUnitario: 0.5 });
    });

    it('una línea sin código con presentacionId da 422 LINEA_SIN_CODIGO y sigue PREPARADO', async () => {
      const cat = await categoriaNueva();
      const p = await presentacion(cat.id, 1);
      const d = await donacion(cat.id, undefined, 2);
      const r = await recibir(opA.token, d.folio, {
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: 2, presentacionId: p.id }],
      }).expect(422);
      expect(r.body.codigo).toBe('LINEA_SIN_CODIGO');
      expect(
        (await a.prisma.comprobante.findUniqueOrThrow({ where: { folio: d.folio } })).estado,
      ).toBe('PREPARADO');
    });

    it('una corrección que pasa el tope de línea da 422 CANTIDAD_FUERA_DE_TOPE', async () => {
      const cat = await categoriaNueva();
      const chica = await presentacion(cat.id, 1);
      const grande = await presentacion(cat.id, 5000);
      const ean = eanNuevo();
      await codigo(ean, cat.id, chica.id, 'VALIDADO');
      const d = await donacion(cat.id, ean, 2);
      const r = await recibir(opA.token, d.folio, {
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: 2000, presentacionId: grande.id }],
      }).expect(422);
      expect(r.body.codigo).toBe('CANTIDAD_FUERA_DE_TOPE');
    });

    it('dos recepciones a la vez del mismo PROPUESTO con presentaciones distintas: una valida, la otra corrige la línea', async () => {
      const cat = await categoriaNueva();
      const base = await presentacion(cat.id, 1, 'PROPUESTO');
      const p2 = await presentacion(cat.id, 2);
      const p3 = await presentacion(cat.id, 3);
      const ean = eanNuevo();
      await codigo(ean, cat.id, base.id, 'PROPUESTO');
      const x = await donacion(cat.id, ean, 1);
      const y = await donacion(cat.id, ean, 1);
      const cuerpo = (d: typeof x, presentacionId: string) => ({
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: 1, presentacionId }],
      });
      const [rx, ry] = await Promise.all([
        recibir(opA.token, x.folio, cuerpo(x, p2.id)),
        recibir(opA2.token, y.folio, cuerpo(y, p3.id)),
      ]);
      expect([rx.status, ry.status]).toEqual([200, 200]);
      const c = await a.prisma.codigoBarras.findUniqueOrThrow({ where: { ean } });
      expect(c.estado).toBe('VALIDADO');
      expect([p2.id, p3.id]).toContain(c.presentacion_id);
      expect(c.por_revisar).toBe(true);
      expect(
        await a.prisma.bitacora.count({
          where: { accion: 'codigo_barras.validado', entidad_id: ean },
        }),
      ).toBe(1);
      expect(await saldo(cat.id)).toBe(5);
    });

    it('un comprobante con dos líneas del mismo PROPUESTO valida una vez', async () => {
      const cat = await categoriaNueva();
      const p = await presentacion(cat.id, 2, 'PROPUESTO');
      const ean = eanNuevo();
      await codigo(ean, cat.id, p.id, 'PROPUESTO');
      const d = await donacion(cat.id, ean, 1);
      const primera = await a.prisma.lineaComprobante.findUniqueOrThrow({
        where: { id: d.lineas[0]!.id },
      });
      const segunda = await a.prisma.lineaComprobante.create({
        data: {
          comprobante_id: primera.comprobante_id,
          categoria_id: cat.id,
          ean,
          contenido_unitario: 2,
          cantidad_declarada: 3,
        },
      });
      await recibir(opA.token, d.folio, {
        acopioId: ACOPIO_A,
        lineas: [primera.id, segunda.id].map((lineaId) => ({ lineaId, cantidadConfirmada: 1 })),
      }).expect(200);
      expect(
        await a.prisma.bitacora.count({
          where: { accion: 'codigo_barras.validado', entidad_id: ean },
        }),
      ).toBe(1);
      expect((await a.prisma.codigoBarras.findUniqueOrThrow({ where: { ean } })).estado).toBe(
        'VALIDADO',
      );
    });

    it('corregir a una presentación PROPUESTO la valida', async () => {
      const cat = await categoriaNueva();
      const base = await presentacion(cat.id, 1);
      const nueva = await presentacion(cat.id, 4, 'PROPUESTO');
      const ean = eanNuevo();
      await codigo(ean, cat.id, base.id, 'VALIDADO');
      const d = await donacion(cat.id, ean, 1);
      await recibir(opA.token, d.folio, {
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: 1, presentacionId: nueva.id }],
      }).expect(200);
      expect(
        (await a.prisma.presentacion.findUniqueOrThrow({ where: { id: nueva.id } })).estado,
      ).toBe('VALIDADO');
    });

    // La migración deja VALIDADO y sin presentación los códigos que no tenían contenido; un
    // PROPUESTO sin presentación es el caso en que la línea se reescribía (I-1)
    it.each(['VALIDADO', 'PROPUESTO'] as const)(
      'un código %s sin presentación al que el Administrador asigna 0,5 kg después: la línea sin corrección entra con su contenido',
      async (estado) => {
        const cat = await categoriaNueva('KILOGRAMO');
        const media = await presentacion(cat.id, 0.5);
        const ean = eanNuevo();
        await codigo(ean, cat.id, null, estado);
        const d = await donacion(cat.id, ean, 3);
        expect(
          Number(
            (await a.prisma.lineaComprobante.findUniqueOrThrow({ where: { id: d.lineas[0]!.id } }))
              .contenido_unitario,
          ),
        ).toBe(1);
        const admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
        await a
          .http()
          .patch(`/api/codigos-barras/${ean}`)
          .set('authorization', `Bearer ${admin}`)
          .send({ presentacionId: media.id })
          .expect(200);
        await recibir(opA.token, d.folio, {
          acopioId: ACOPIO_A,
          lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: 3 }],
        }).expect(200);
        expect(await saldo(cat.id)).toBe(3);
        const l = await a.prisma.lineaComprobante.findUniqueOrThrow({
          where: { id: d.lineas[0]!.id },
        });
        expect(Number(l.contenido_unitario)).toBe(1);
        const comprobante = await a.prisma.comprobante.findUniqueOrThrow({
          where: { folio: d.folio },
        });
        expect(
          await a.prisma.bitacora.count({
            where: { accion: 'comprobante.linea_corregida', entidad_id: comprobante.id },
          }),
        ).toBe(0);
      },
    );

    it('dos recepciones a la vez del mismo PROPUESTO, una corrige a P2 y la otra no: la segunda línea guarda su tamaño', async () => {
      const cat = await categoriaNueva();
      const base = await presentacion(cat.id, 1, 'PROPUESTO');
      const p2 = await presentacion(cat.id, 2);
      const ean = eanNuevo();
      await codigo(ean, cat.id, base.id, 'PROPUESTO');
      const x = await donacion(cat.id, ean, 1);
      const y = await donacion(cat.id, ean, 1);
      const [rx, ry] = await Promise.all([
        recibir(opA.token, x.folio, {
          acopioId: ACOPIO_A,
          lineas: [{ lineaId: x.lineas[0]!.id, cantidadConfirmada: 1, presentacionId: p2.id }],
        }),
        recibir(opA2.token, y.folio, {
          acopioId: ACOPIO_A,
          lineas: [{ lineaId: y.lineas[0]!.id, cantidadConfirmada: 1 }],
        }),
      ]);
      expect([rx.status, ry.status]).toEqual([200, 200]);
      const ly = await a.prisma.lineaComprobante.findUniqueOrThrow({
        where: { id: y.lineas[0]!.id },
      });
      expect(Number(ly.contenido_unitario)).toBe(1);
      const lx = await a.prisma.lineaComprobante.findUniqueOrThrow({
        where: { id: x.lineas[0]!.id },
      });
      expect(Number(lx.contenido_unitario)).toBe(2);
      // 1 × 2 L de la corregida y 1 × 1 L de la otra
      expect(await saldo(cat.id)).toBe(3);
      const cy = await a.prisma.comprobante.findUniqueOrThrow({ where: { folio: y.folio } });
      expect(
        await a.prisma.bitacora.count({
          where: { accion: 'comprobante.linea_corregida', entidad_id: cy.id },
        }),
      ).toBe(0);
    });

    it('un PROPUESTO en una línea recibida en cero sigue PROPUESTO, y su presentación también', async () => {
      const cat = await categoriaNueva();
      const p = await presentacion(cat.id, 1, 'PROPUESTO');
      const ean = eanNuevo();
      await codigo(ean, cat.id, p.id, 'PROPUESTO');
      const d = await donacion(cat.id, ean, 2);
      await recibir(opA.token, d.folio, {
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: 0 }],
      }).expect(200);
      expect((await a.prisma.codigoBarras.findUniqueOrThrow({ where: { ean } })).estado).toBe(
        'PROPUESTO',
      );
      expect((await a.prisma.presentacion.findUniqueOrThrow({ where: { id: p.id } })).estado).toBe(
        'PROPUESTO',
      );
      expect(
        await a.prisma.bitacora.count({
          where: { accion: 'codigo_barras.validado', entidad_id: ean },
        }),
      ).toBe(0);
    });

    it('dos recepciones con los mismos EAN en orden cruzado no se traban', async () => {
      const cat = await categoriaNueva();
      const pa = await presentacion(cat.id, 1, 'PROPUESTO');
      const pb = await presentacion(cat.id, 2, 'PROPUESTO');
      const e1 = eanNuevo();
      const e2 = e1.slice(0, -1) + ((Number(e1.slice(-1)) + 1) % 10);
      await codigo(e1, cat.id, pa.id, 'PROPUESTO');
      await codigo(e2, cat.id, pb.id, 'PROPUESTO');
      const dos = async (orden: string[]) => {
        const donador = await crearDonador(a);
        const r = await a
          .http()
          .post('/api/donaciones')
          .set('authorization', `Bearer ${donador.token}`)
          .send({
            acopioId: ACOPIO_A,
            lineas: orden.map((ean) => ({ categoriaId: cat.id, ean, cantidad: 1 })),
          })
          .expect(201);
        return r.body as { folio: string; lineas: { id: string }[] };
      };
      const x = await dos([e1, e2]);
      const y = await dos([e2, e1]);
      const cuerpo = (d: typeof x) => ({
        acopioId: ACOPIO_A,
        lineas: d.lineas.map((l) => ({ lineaId: l.id, cantidadConfirmada: 1 })),
      });
      const [rx, ry] = await Promise.all([
        recibir(opA.token, x.folio, cuerpo(x)),
        recibir(opA2.token, y.folio, cuerpo(y)),
      ]);
      expect([rx.status, ry.status]).toEqual([200, 200]);
    });

    it('correcciones cruzadas a presentaciones PROPUESTO a la vez no se traban y validan cada una una vez', async () => {
      const cat = await categoriaNueva();
      const base = await presentacion(cat.id, 1);
      const p1 = await presentacion(cat.id, 2, 'PROPUESTO');
      const p2 = await presentacion(cat.id, 3, 'PROPUESTO');
      const e1 = eanNuevo();
      const e2 = e1.slice(0, -1) + ((Number(e1.slice(-1)) + 1) % 10);
      await codigo(e1, cat.id, base.id, 'VALIDADO');
      await codigo(e2, cat.id, base.id, 'VALIDADO');
      const dos = async () => {
        const donador = await crearDonador(a);
        const r = await a
          .http()
          .post('/api/donaciones')
          .set('authorization', `Bearer ${donador.token}`)
          .send({
            acopioId: ACOPIO_A,
            lineas: [e1, e2].map((ean) => ({ categoriaId: cat.id, ean, cantidad: 1 })),
          })
          .expect(201);
        return r.body as { folio: string; lineas: { id: string }[] };
      };
      const x = await dos();
      const y = await dos();
      const cuerpo = async (d: typeof x, orden: string[]) => {
        const filas = await a.prisma.lineaComprobante.findMany({
          where: { id: { in: d.lineas.map((l) => l.id) } },
        });
        return {
          acopioId: ACOPIO_A,
          lineas: filas.map((l) => ({
            lineaId: l.id,
            cantidadConfirmada: 1,
            presentacionId: l.ean === e1 ? orden[0] : orden[1],
          })),
        };
      };
      const [rx, ry] = await Promise.all([
        recibir(opA.token, x.folio, await cuerpo(x, [p2.id, p1.id])),
        recibir(opA2.token, y.folio, await cuerpo(y, [p1.id, p2.id])),
      ]);
      expect([rx.status, ry.status]).toEqual([200, 200]);
      for (const id of [p1.id, p2.id]) {
        expect(
          await a.prisma.bitacora.count({
            where: { accion: 'presentacion.editada', entidad_id: id },
          }),
        ).toBe(1);
      }
    });
  });
});
