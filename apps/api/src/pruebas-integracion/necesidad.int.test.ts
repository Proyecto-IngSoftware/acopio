import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  EMERGENCIA_PRUEBA,
  ZONA_A,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { generarCodigoRemision } from '../modulos/motor/codigo-remision';

/** RF-MOT-002, 003 y 004 en lectura: la ficha de zona y los excedentes. */
describe('necesidad y excedentes', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  let adminId: string;
  let agua: string;
  let arroz: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const DIA = 86_400_000;

  const entrada = (
    acopio: string,
    categoria: string,
    cantidad: number,
    venceEn: Date | null = null,
  ) =>
    a.prisma.movimiento.create({
      data: {
        acopio_id: acopio,
        categoria_id: categoria,
        tipo: 'ENTRADA',
        signo: 1,
        cantidad,
        vence_en: venceEn,
        usuario_id: adminId,
        ocurrido_en: new Date(),
      },
    });

  /** Una remisión de ACOPIO_B a ZONA_A con una línea; RECIBIDA crea su RECEPCION. */
  async function remision(
    estado: 'BORRADOR' | 'EN_TRANSITO' | 'RECIBIDA',
    categoria: string,
    cantidad: number,
    ocurrido = new Date(),
  ) {
    const r = await a.prisma.remision.create({
      data: {
        codigo: generarCodigoRemision(2026),
        acopio_origen_id: ACOPIO_B,
        zona_destino_id: ZONA_A,
        qr_token: unico('qr'),
        creada_por: adminId,
        lineas: { create: [{ categoria_id: categoria, cantidad_planeada: cantidad }] },
      },
    });
    if (estado === 'BORRADOR') return r;
    await a.prisma.remision.update({
      where: { id: r.id },
      data: { estado: 'EN_TRANSITO', responsable: 'Conductor', despachada_en: ocurrido },
    });
    if (estado === 'EN_TRANSITO') return r;
    await a.prisma.movimiento.create({
      data: {
        zona_id: ZONA_A,
        categoria_id: categoria,
        tipo: 'RECEPCION',
        signo: 1,
        cantidad,
        remision_id: r.id,
        usuario_id: adminId,
        ocurrido_en: ocurrido,
      },
    });
    return a.prisma.remision.update({
      where: { id: r.id },
      data: { estado: 'RECIBIDA', recibida_en: ocurrido, evidencia_keys: ['prueba/foto.webp'] },
    });
  }

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
    // Categorías propias: la canasta del seed también aparece en la ficha
    // La canasta del seed: crear otra fila de canasta cambiaría lo que ven otras suites
    agua = (await a.prisma.categoria.findUniqueOrThrow({ where: { nombre: 'Agua potable' } })).id;
    arroz = (
      await a.prisma.categoria.create({
        data: {
          nombre: unico('Arroz motor '),
          grupo: 'ALIMENTOS',
          unidad_base: 'KILOGRAMO',
          perecedero: true,
        },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  const ficha = async (token = tokenAdmin) =>
    (await a.http().get(`/api/zonas/${ZONA_A}/necesidad`).set(como(token)).expect(200)).body;
  const fila = (body: { categorias: { categoriaId: string }[] }, cat: string) =>
    body.categorias.find((c) => c.categoriaId === cat) as Record<string, unknown> | undefined;

  it('la necesidad sale de la canasta, la población y el horizonte, con sus fuentes', async () => {
    const body = await ficha();
    expect(body.zona).toMatchObject({
      id: ZONA_A,
      poblacionEstimada: 1200,
      poblacionFuente: 'Censo de prueba',
    });
    expect(body.zona.emergencia).toMatchObject({ id: EMERGENCIA_PRUEBA, horizonteDias: 7 });
    expect(fila(body, agua)).toMatchObject({
      origen: 'CANASTA',
      cantidadPersonaDia: 15,
      fuenteCanasta: expect.stringContaining('Esfera'),
      necesidad: 126000,
      recibido: 0,
      enCamino: 0,
      deficit: 126000,
      cobertura: 0,
    });
  });

  it('cuenta lo recibido en la ventana del horizonte y lo que va en camino', async () => {
    await remision('RECIBIDA', agua, 26000);
    await remision('RECIBIDA', agua, 50000, new Date(Date.now() - 8 * DIA)); // fuera de la ventana
    await remision('EN_TRANSITO', agua, 10000);
    await remision('BORRADOR', agua, 5000);
    expect(fila(await ficha(), agua)).toMatchObject({
      recibido: 26000,
      enCamino: 15000,
      deficit: 85000,
    });
  });

  it('la necesidad manual reemplaza el cálculo y dice quién la puso', async () => {
    await a
      .http()
      .put(`/api/zonas/${ZONA_A}/necesidad-manual/${arroz}`)
      .set(como(tokenAdmin))
      .send({ cantidad: 500, motivo: 'Lote de arroz dañado por el agua' })
      .expect(200);
    expect(fila(await ficha(), arroz)).toMatchObject({
      origen: 'MANUAL',
      necesidad: 500,
      manual: expect.objectContaining({ cantidad: 500, puestaPor: expect.any(String) }),
    });
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'necesidad.manual', ubicacion_id: ZONA_A },
      }),
    ).not.toBeNull();
  });

  it('quitar la necesidad manual vuelve al cálculo; sin canasta, la categoría sale de la ficha', async () => {
    await a
      .http()
      .put(`/api/zonas/${ZONA_A}/necesidad-manual/${arroz}`)
      .set(como(tokenAdmin))
      .send({ cantidad: null, motivo: 'Ya llegó la reposición del lote' })
      .expect(200);
    expect(fila(await ficha(), arroz)).toBeUndefined();
  });

  it('un motivo corto no se acepta', async () => {
    await a
      .http()
      .put(`/api/zonas/${ZONA_A}/necesidad-manual/${arroz}`)
      .set(como(tokenAdmin))
      .send({ cantidad: 5, motivo: 'corto' })
      .expect(400);
  });

  it('trae la cobertura global y la categoría más baja', async () => {
    const body = await ficha();
    expect(typeof body.coberturaGlobal).toBe('number');
    expect(body.categoriaMasBaja).toEqual(
      expect.objectContaining({ categoriaId: expect.any(String) }),
    );
  });

  it('el Receptor de la zona la lee; el de otra zona y el Operador no', async () => {
    // Zonas propias: un Receptor más en ZONA_A cambia lo que ven otras suites
    const zona = (nombre: string) =>
      a.prisma.zona.create({
        data: {
          emergencia_id: EMERGENCIA_PRUEBA,
          nombre: unico(nombre),
          municipio: 'Bogotá',
          lat: 4.5,
          lng: -74.2,
          poblacion_estimada: 10,
          poblacion_fuente: 'Prueba',
          poblacion_fecha: new Date(),
        },
      });
    const propia = await zona('Zona del receptor ');
    const otra = await zona('Otra zona ');
    const receptor = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'RECEPTOR',
      asignaciones: [{ tipo: 'ZONA', ubicacionId: propia.id }],
    });
    const ruta = `/api/zonas/${propia.id}/necesidad`;
    await a.http().get(ruta).set(como(receptor.token)).expect(200);
    const ajeno = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'RECEPTOR',
      asignaciones: [{ tipo: 'ZONA', ubicacionId: otra.id }],
    });
    await a.http().get(ruta).set(como(ajeno.token)).expect(403);
    const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
    await a.http().get(ruta).set(como(op.token)).expect(403);
  });

  it('una zona de una emergencia cerrada se lee, pero no admite necesidad manual', async () => {
    const cerrada = await a.prisma.emergencia.create({
      data: {
        nombre: unico('Cerrada '),
        tipo: 'Sequía',
        inicio: new Date('2026-01-01T00:00:00Z'),
        destacada_hasta: new Date('2026-02-01T00:00:00Z'),
        estado: 'CERRADA',
        cerrada_en: new Date(),
        motivo_cierre: 'Terminó',
      },
    });
    const z = await a.prisma.zona.create({
      data: {
        emergencia_id: cerrada.id,
        nombre: unico('Zona cerrada '),
        municipio: 'Bogotá',
        lat: 4.5,
        lng: -74.1,
        poblacion_estimada: 100,
        poblacion_fuente: 'Prueba',
        poblacion_fecha: new Date(),
      },
    });
    await a.http().get(`/api/zonas/${z.id}/necesidad`).set(como(tokenAdmin)).expect(200);
    const r = await a
      .http()
      .put(`/api/zonas/${z.id}/necesidad-manual/${arroz}`)
      .set(como(tokenAdmin))
      .send({ cantidad: 5, motivo: 'Prueba en zona cerrada' })
      .expect(409);
    expect(r.body.codigo).toBe('ZONA_SOLO_LECTURA');
  });

  describe('excedentes', () => {
    it('descuenta lo comprometido en borradores y avisa sin umbral', async () => {
      await entrada(ACOPIO_B, agua, 900);
      await a.prisma.umbral.create({
        data: {
          acopio_id: ACOPIO_B,
          categoria_id: agua,
          minimo: 100,
          maximo: 400,
          actualizado_por: adminId,
        },
      });
      await entrada(ACOPIO_B, arroz, 50, new Date('2099-01-01T00:00:00Z'));
      const r = await a
        .http()
        .get(`/api/acopios/${ACOPIO_B}/excedentes`)
        .set(como(tokenAdmin))
        .expect(200);
      const filaAgua = r.body.find((x: { categoriaId: string }) => x.categoriaId === agua);
      // Otras suites también dejan agua potable en ACOPIO_B: el saldo se lee, no se supone
      const saldo = Number(
        (
          await a.prisma.saldo.findUniqueOrThrow({
            where: { acopio_id_categoria_id: { acopio_id: ACOPIO_B, categoria_id: agua } },
          })
        ).cantidad,
      );
      expect(saldo).toBeGreaterThanOrEqual(900);
      // Lo que pasa del máximo (400), menos 5000 en el borrador que sale de ACOPIO_B: nada movible
      expect(filaAgua).toMatchObject({
        saldo,
        superavit: Math.round((saldo - 400) * 1000) / 1000,
        comprometido: 5000,
        movible: 0,
        aviso: null,
      });
      expect(r.body.find((x: { categoriaId: string }) => x.categoriaId === arroz)).toMatchObject({
        aviso: 'SIN_UMBRAL',
        movible: 0,
      });
    });

    it('lo vencido no se mueve', async () => {
      const leche = (
        await a.prisma.categoria.create({
          data: {
            nombre: unico('Leche motor '),
            grupo: 'ALIMENTOS',
            unidad_base: 'LITRO',
            perecedero: true,
          },
        })
      ).id;
      await entrada(ACOPIO_A, leche, 30, new Date('2026-01-01T00:00:00Z'));
      await entrada(ACOPIO_A, leche, 50, new Date('2099-01-01T00:00:00Z'));
      await a.prisma.umbral.create({
        data: {
          acopio_id: ACOPIO_A,
          categoria_id: leche,
          minimo: 0,
          maximo: 20,
          actualizado_por: adminId,
        },
      });
      const r = await a
        .http()
        .get(`/api/acopios/${ACOPIO_A}/excedentes`)
        .set(como(tokenAdmin))
        .expect(200);
      expect(r.body.find((x: { categoriaId: string }) => x.categoriaId === leche)).toMatchObject({
        vencido: 30,
        movible: 30,
      });
    });

    it('el Operador ve los de su acopio y no los de otro', async () => {
      const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
      await a.http().get(`/api/acopios/${ACOPIO_A}/excedentes`).set(como(op.token)).expect(200);
      await a.http().get(`/api/acopios/${ACOPIO_B}/excedentes`).set(como(op.token)).expect(403);
    });
  });

  it('en una categoría por unidades, la necesidad manual es entera', async () => {
    const jabon = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Jabón '), grupo: 'ASEO_PERSONAL', unidad_base: 'UNIDAD' },
      })
    ).id;
    const r = await a
      .http()
      .put(`/api/zonas/${ZONA_A}/necesidad-manual/${jabon}`)
      .set(como(tokenAdmin))
      .send({ cantidad: 10.5, motivo: 'Familias que llegaron anoche' })
      .expect(422);
    expect(r.body.codigo).toBe('CANTIDAD_ENTERA');
  });
});
