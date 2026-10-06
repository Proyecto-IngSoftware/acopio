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

describe('bandeja y conciliación (RF-CMP-003 a 005)', () => {
  let a: AppPrueba;
  let donador: Awaited<ReturnType<typeof crearDonador>>;
  let admin: Awaited<ReturnType<typeof iniciarSesion>>;
  let op: Usuario;
  let opB: Usuario;
  let auditor: Usuario;
  let auditorB: Usuario;
  let categoria: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    donador = await crearDonador(a);
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    op = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
    opB = await crearUsuarioActivo(a, admin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_B }],
    });
    auditor = await crearUsuarioActivo(a, admin, { rol: 'AUDITOR' });
    auditorB = await crearUsuarioActivo(a, admin, {
      rol: 'AUDITOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_B }],
    });
    categoria = (
      await a.prisma.categoria.findFirstOrThrow({
        where: { perecedero: false, unidad_base: 'UNIDAD', archivada: false },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  const como = (token: string) => ({
    get: (ruta: string) => a.http().get(ruta).set('authorization', `Bearer ${token}`),
    post: (ruta: string, cuerpo?: object) =>
      a.http().post(ruta).set('authorization', `Bearer ${token}`).send(cuerpo),
  });
  const preparada = async (cantidad = 10) => {
    const r = await como(donador.token)
      .post('/api/donaciones', {
        acopioId: ACOPIO_A,
        lineas: [{ categoriaId: categoria, cantidad }],
      })
      .expect(201);
    return r.body as { folio: string; lineas: { id: string }[] };
  };
  const recibida = async (declarada = 10, confirmada = 10) => {
    const d = await preparada(declarada);
    await como(op.token)
      .post(`/api/comprobantes/${d.folio}/recepcion`, {
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: confirmada }],
      })
      .expect(200);
    return d.folio;
  };
  const folios = (cuerpo: { comprobantes: { folio: string }[] }) =>
    cuerpo.comprobantes.map((c) => c.folio);

  it('la bandeja trae las pendientes de su alcance, de la más vieja a la más nueva, con la diferencia marcada', async () => {
    const igual = await recibida(10, 10);
    const distinta = await recibida(10, 8);
    const r = await como(auditor.token).get('/api/comprobantes').expect(200);
    expect(folios(r.body).indexOf(igual)).toBeLessThan(folios(r.body).indexOf(distinta));
    const fila = (folio: string) =>
      r.body.comprobantes.find((c: { folio: string }) => c.folio === folio);
    expect(fila(igual).conDiferencia).toBe(false);
    expect(fila(distinta).conDiferencia).toBe(true);
    expect(
      r.body.porAcopio.find((x: { acopioId: string }) => x.acopioId === ACOPIO_A).pendientes,
    ).toBeGreaterThanOrEqual(2);
    const deB = await como(auditorB.token).get('/api/comprobantes').expect(200);
    expect(folios(deB.body)).not.toContain(igual);
  });

  it('el detalle compara por categoría lo confirmado con las entradas vinculadas', async () => {
    const folio = await recibida(10, 8);
    const r = await como(auditor.token).get(`/api/comprobantes/${folio}/conciliacion`).expect(200);
    expect(r.body.resumen).toEqual([
      expect.objectContaining({ categoriaId: categoria, confirmado: 8, entradas: 8, cuadra: true }),
    ]);
    expect(r.body.entradas).toHaveLength(1);
  });

  it('conciliar cierra la donación', async () => {
    const folio = await recibida();
    const r = await como(auditor.token).post(`/api/comprobantes/${folio}/conciliar`).expect(200);
    expect(r.body.estado).toBe('CONCILIADO');
    const c = await a.prisma.comprobante.findUniqueOrThrow({ where: { folio } });
    expect(c.verificado_por).toBe(auditor.id);
    expect(c.cerrado_en).not.toBeNull();
  });

  it('sin entradas vinculadas no se concilia', async () => {
    const d = await preparada();
    await como(op.token)
      .post(`/api/comprobantes/${d.folio}/recepcion`, {
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.lineas[0]!.id, cantidadConfirmada: 0 }],
      })
      .expect(200);
    const r = await como(auditor.token).post(`/api/comprobantes/${d.folio}/conciliar`).expect(422);
    expect(r.body.codigo).toBe('SIN_VINCULOS');
  });

  it('un folio entregado sin red se vincula a entradas ya registradas y pasa a PENDIENTE', async () => {
    const d = await preparada();
    const entrada = await como(op.token)
      .post(`/api/acopios/${ACOPIO_A}/entradas`, { categoriaId: categoria, cantidad: 10 })
      .expect(201);
    const id = entrada.body.movimiento.id as string;
    const vinculables = await como(auditor.token)
      .get(`/api/comprobantes/${d.folio}/entradas-vinculables`)
      .expect(200);
    expect(vinculables.body.map((m: { id: string }) => m.id)).toContain(id);
    const r = await como(auditor.token)
      .post(`/api/comprobantes/${d.folio}/vinculos`, { movimientoIds: [id] })
      .expect(200);
    expect(r.body.estado).toBe('PENDIENTE');
    await como(auditor.token).post(`/api/comprobantes/${d.folio}/conciliar`).expect(200);
  });

  it('no vincula una entrada que ya es de otra donación, ni una salida (foco de revisión 5)', async () => {
    const usada = await recibida();
    const vinculo = await a.prisma.comprobanteMovimiento.findFirstOrThrow({
      where: { comprobante: { folio: usada } },
    });
    const salida = await como(op.token)
      .post(`/api/acopios/${ACOPIO_A}/salidas`, {
        categoriaId: categoria,
        cantidad: 1,
        motivoSalida: 'ENTREGA_FAMILIAS',
      })
      .expect(201);
    const d = await preparada();
    for (const id of [vinculo.movimiento_id, salida.body.movimiento.id as string]) {
      const r = await como(auditor.token)
        .post(`/api/comprobantes/${d.folio}/vinculos`, { movimientoIds: [id] })
        .expect(422);
      expect(r.body.codigo).toBe('MOVIMIENTO_NO_VINCULABLE');
    }
    expect(
      await a.prisma.comprobanteMovimiento.count({ where: { comprobante: { folio: d.folio } } }),
    ).toBe(0);
  });

  it('un lote con una entrada libre y una ya vinculada se rechaza entero', async () => {
    const usada = await recibida();
    const vinculo = await a.prisma.comprobanteMovimiento.findFirstOrThrow({
      where: { comprobante: { folio: usada } },
    });
    const libre = await como(op.token)
      .post(`/api/acopios/${ACOPIO_A}/entradas`, { categoriaId: categoria, cantidad: 3 })
      .expect(201);
    const d = await preparada();
    const r = await como(auditor.token)
      .post(`/api/comprobantes/${d.folio}/vinculos`, {
        movimientoIds: [libre.body.movimiento.id, vinculo.movimiento_id],
      })
      .expect(422);
    expect(r.body.codigo).toBe('MOVIMIENTO_NO_VINCULABLE');
    expect(
      await a.prisma.comprobanteMovimiento.count({ where: { comprobante: { folio: d.folio } } }),
    ).toBe(0);
    expect(
      await a.prisma.comprobanteMovimiento.count({
        where: { movimiento_id: libre.body.movimiento.id },
      }),
    ).toBe(0);
  });

  it('el Auditor de B no vincula un folio de A a una entrada de B; el Administrador sí y el folio pasa a B', async () => {
    const d = await preparada();
    const entrada = await como(opB.token)
      .post(`/api/acopios/${ACOPIO_B}/entradas`, { categoriaId: categoria, cantidad: 4 })
      .expect(201);
    const id = entrada.body.movimiento.id as string;
    await como(auditorB.token)
      .post(`/api/comprobantes/${d.folio}/vinculos`, { movimientoIds: [id] })
      .expect(403);
    expect(
      await a.prisma.comprobanteMovimiento.count({ where: { comprobante: { folio: d.folio } } }),
    ).toBe(0);
    const r = await como(admin)
      .post(`/api/comprobantes/${d.folio}/vinculos`, { movimientoIds: [id] })
      .expect(200);
    expect(r.body.acopio.id).toBe(ACOPIO_B);
  });

  it('una entrada de una categoría que no está en las líneas aparece en el resumen sin cuadrar', async () => {
    const otra = (
      await a.prisma.categoria.findFirstOrThrow({
        where: { id: { not: categoria }, perecedero: false, archivada: false },
      })
    ).id;
    const folio = await recibida();
    const extra = await como(op.token)
      .post(`/api/acopios/${ACOPIO_A}/entradas`, { categoriaId: otra, cantidad: 2 })
      .expect(201);
    await como(auditor.token)
      .post(`/api/comprobantes/${folio}/vinculos`, { movimientoIds: [extra.body.movimiento.id] })
      .expect(200);
    const r = await como(auditor.token).get(`/api/comprobantes/${folio}/conciliacion`).expect(200);
    expect(r.body.resumen).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categoriaId: otra, confirmado: 0, entradas: 2, cuadra: false }),
      ]),
    );
  });

  it('rechazar pide motivo, avisa al Donador por correo, no borra mercancía y se puede revertir', async () => {
    const folio = await recibida(10, 8);
    await como(auditor.token)
      .post(`/api/comprobantes/${folio}/rechazar`, { motivo: 'OTRO' })
      .expect(400);
    const r = await como(auditor.token)
      .post(`/api/comprobantes/${folio}/rechazar`, {
        motivo: 'DIFERENCIA_SIN_EXPLICAR',
        nota: 'Faltan 2 sin explicación',
      })
      .expect(200);
    expect(r.body.estado).toBe('RECHAZADO');
    const correo = await a.prisma.correoSaliente.findFirstOrThrow({
      where: { destinatario: donador.correo, cuerpo_texto: { contains: folio } },
    });
    expect(correo.cuerpo_texto).toContain('Faltan 2 sin explicación');
    expect(await a.prisma.comprobanteMovimiento.count({ where: { comprobante: { folio } } })).toBe(
      1,
    );

    const vuelta = await como(auditor.token)
      .post(`/api/comprobantes/${folio}/revertir-rechazo`)
      .expect(200);
    expect(vuelta.body).toMatchObject({
      estado: 'PENDIENTE',
      motivoRechazo: null,
      notaRechazo: null,
    });
  });

  it('el Auditor de otro acopio no concilia', async () => {
    const folio = await recibida();
    await como(auditorB.token).post(`/api/comprobantes/${folio}/conciliar`).expect(403);
  });

  it('un Operador no concilia', async () => {
    const folio = await recibida();
    await como(op.token).post(`/api/comprobantes/${folio}/conciliar`).expect(403);
  });
});
