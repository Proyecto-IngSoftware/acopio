import sharp from 'sharp';
import { TareasCustodiaService } from '../modulos/comprobantes/tareas-custodia.service';
import {
  ACOPIO_A,
  almacenPrueba,
  crearAppPrueba,
  crearDonador,
  type AppPrueba,
} from '../../test/app-prueba';

const DIA = 86_400_000;

describe('tareas programadas de custodia', () => {
  let a: AppPrueba;
  let donador: Awaited<ReturnType<typeof crearDonador>>;
  let tareas: TareasCustodiaService;
  let categoria: string;
  let jpeg: Buffer;

  beforeAll(async () => {
    a = await crearAppPrueba();
    donador = await crearDonador(a);
    tareas = a.app.get(TareasCustodiaService);
    categoria = (
      await a.prisma.categoria.findFirstOrThrow({ where: { perecedero: false, archivada: false } })
    ).id;
    jpeg = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#ddd' } })
      .jpeg()
      .toBuffer();
  });
  afterAll(() => a.cerrar());

  const preparar = async () => {
    const r = await a
      .http()
      .post('/api/donaciones')
      .set('authorization', `Bearer ${donador.token}`)
      .send({ acopioId: ACOPIO_A, lineas: [{ categoriaId: categoria, cantidad: 1 }] })
      .expect(201);
    return r.body.folio as string;
  };
  const conFactura = async () => {
    const folio = await preparar();
    await a
      .http()
      .post(`/api/donaciones/${folio}/factura`)
      .set('authorization', `Bearer ${donador.token}`)
      .attach('factura', jpeg, 'factura.jpg')
      .expect(200);
    return folio;
  };
  const leer = (folio: string) => a.prisma.comprobante.findUniqueOrThrow({ where: { folio } });

  it('cancela las preparadas de más de 7 días y deja las recientes', async () => {
    const vieja = await preparar();
    const reciente = await preparar();
    await a.prisma.comprobante.update({
      where: { folio: vieja },
      data: { creado_en: new Date(Date.now() - 8 * DIA) },
    });

    expect(await tareas.cancelarVencidas()).toBeGreaterThanOrEqual(1);

    const c = await leer(vieja);
    expect(c.estado).toBe('CANCELADO');
    expect(c.cerrado_en).not.toBeNull();
    expect((await leer(reciente)).estado).toBe('PREPARADO');
    const evento = await a.prisma.bitacora.findFirstOrThrow({
      where: { accion: 'comprobante.vencido', entidad_id: c.id },
    });
    expect(evento.usuario_id).toBeNull();
  });

  it('borra las facturas de comprobantes cerrados hace 12 meses y deja las demás', async () => {
    const vencida = await conFactura();
    const vigente = await conFactura();
    const haceTreceMeses = new Date(Date.now() - 395 * DIA);
    const haceOnceMeses = new Date(Date.now() - 330 * DIA);
    await a.prisma.comprobante.update({
      where: { folio: vencida },
      data: { estado: 'CANCELADO', cerrado_en: haceTreceMeses },
    });
    await a.prisma.comprobante.update({
      where: { folio: vigente },
      data: { estado: 'CANCELADO', cerrado_en: haceOnceMeses },
    });
    const antes = await leer(vencida);

    expect(await tareas.borrarFacturasVencidas()).toBeGreaterThanOrEqual(1);

    const despues = await leer(vencida);
    expect(despues).toMatchObject({ factura_key: null, miniatura_key: null });
    expect(despues.factura_borrada_en).not.toBeNull();
    expect(almacenPrueba.objetos.has(antes.factura_key!)).toBe(false);
    expect(almacenPrueba.objetos.has(antes.miniatura_key!)).toBe(false);

    const otra = await leer(vigente);
    expect(otra.factura_key).not.toBeNull();
    expect(almacenPrueba.objetos.has(otra.factura_key!)).toBe(true);
    await a.prisma.bitacora.findFirstOrThrow({
      where: { accion: 'comprobante.factura_borrada', entidad_id: antes.id },
    });
  });

  it('una segunda corrida no encuentra nada que borrar', async () => {
    const folio = await conFactura();
    await a.prisma.comprobante.update({
      where: { folio },
      data: { estado: 'CANCELADO', cerrado_en: new Date(Date.now() - 400 * DIA) },
    });
    await tareas.borrarFacturasVencidas();
    expect(await tareas.borrarFacturasVencidas()).toBe(0);
  });
});
