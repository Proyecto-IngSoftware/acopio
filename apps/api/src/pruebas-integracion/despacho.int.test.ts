import {
  ACOPIO_A,
  ADMIN,
  ZONA_A,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { generarFolio } from '../modulos/comprobantes/folio';
import { SugerenciasService } from '../modulos/motor/sugerencias.service';

/** RF-MOT-008 y M-07: despachar con salidas y folios, y cancelar en borrador o en tránsito. */
describe('despacho y cancelación de remisiones', () => {
  let a: AppPrueba;
  let admin: string;
  let adminId: string;
  let operador: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const post = (url: string, t: string, cuerpo: object) =>
    a.http().post(url).set(como(t)).send(cuerpo);
  const get = (url: string, t: string) => a.http().get(url).set(como(t));

  /** Una categoría nueva con ese saldo en ACOPIO_A y umbral 0/0: todo es movible. */
  async function categoria(saldo: number) {
    const id = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Despacho '), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO' },
      })
    ).id;
    await a.prisma.movimiento.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: id,
        tipo: 'ENTRADA',
        signo: 1,
        cantidad: saldo,
        usuario_id: adminId,
        ocurrido_en: new Date(),
      },
    });
    await a.prisma.umbral.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: id,
        minimo: 0,
        maximo: 0,
        actualizado_por: adminId,
      },
    });
    return id;
  }

  const saldo = async (cat: string) =>
    Number(
      (
        await a.prisma.saldo.findUnique({
          where: { acopio_id_categoria_id: { acopio_id: ACOPIO_A, categoria_id: cat } },
        })
      )?.cantidad ?? 0,
    );

  async function borrador(cat: string, cantidad: number, responsable: string | null) {
    const r = await post('/api/remisiones', operador, {
      acopioId: ACOPIO_A,
      zonaId: ZONA_A,
      responsable,
      lineas: [{ categoriaId: cat, cantidad }],
    }).expect(201);
    return r.body as { id: string; codigo: string };
  }

  async function folio(estado: 'CONCILIADO' | 'PENDIENTE') {
    const c = await a.prisma.comprobante.create({
      data: { folio: generarFolio(2026), donador_id: adminId, acopio_id: ACOPIO_A, estado },
    });
    return c.folio;
  }

  beforeAll(async () => {
    a = await crearAppPrueba();
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
    operador = (await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' })).token;
  });
  afterAll(() => a.cerrar());

  it('despachar crea una SALIDA por línea, baja el saldo y deja la remisión en tránsito', async () => {
    const cat = await categoria(40);
    const r = await borrador(cat, 10, 'Ana');
    const d = await post(`/api/remisiones/${r.codigo}/despachar`, operador, {}).expect(200);
    expect(d.body.estado).toBe('EN_TRANSITO');
    expect(d.body.despachadaEn).not.toBeNull();
    const salidas = await a.prisma.movimiento.findMany({
      where: { remision_id: r.id, tipo: 'SALIDA' },
    });
    expect(salidas).toHaveLength(1);
    expect(salidas[0]).toMatchObject({ motivo_salida: 'TRASLADO', nota: `Remisión ${r.codigo}` });
    expect(await saldo(cat)).toBe(30);
  });

  it('sin responsable no se despacha', async () => {
    const cat = await categoria(5);
    const r = await borrador(cat, 1, null);
    const d = await post(`/api/remisiones/${r.codigo}/despachar`, operador, {}).expect(422);
    expect(d.body.codigo).toBe('RESPONSABLE_OBLIGATORIO');
  });

  it('si el saldo bajó después del borrador, el despacho no escribe nada', async () => {
    const cat = await categoria(30);
    const r = await borrador(cat, 30, 'Ana');
    await post(`/api/acopios/${ACOPIO_A}/salidas`, operador, {
      categoriaId: cat,
      cantidad: 25,
      motivoSalida: 'ENTREGA_FAMILIAS',
    }).expect(201);
    const d = await post(`/api/remisiones/${r.codigo}/despachar`, operador, {}).expect(409);
    expect(d.body.codigo).toBe('SALDO_INSUFICIENTE');
    expect(await a.prisma.movimiento.count({ where: { remision_id: r.id } })).toBe(0);
    const rem = await a.prisma.remision.findUniqueOrThrow({ where: { id: r.id } });
    expect(rem.estado).toBe('BORRADOR');
  });

  it('vincula folios conciliados del mismo acopio y rechaza los demás', async () => {
    const cat = await categoria(5);
    const conciliado = await folio('CONCILIADO');
    const pendiente = await folio('PENDIENTE');
    const r = await borrador(cat, 1, 'Ana');
    const mal = await post(`/api/remisiones/${r.codigo}/despachar`, operador, {
      folios: [pendiente],
    }).expect(422);
    expect(mal.body.codigo).toBe('FOLIO_NO_VINCULABLE');
    const bien = await post(`/api/remisiones/${r.codigo}/despachar`, operador, {
      folios: [conciliado],
    }).expect(200);
    expect(bien.body.folios).toEqual([conciliado]);
    expect(await a.prisma.remisionComprobante.count({ where: { remision_id: r.id } })).toBe(1);
  });

  it('cancelar un borrador libera el compromiso sin movimientos', async () => {
    const cat = await categoria(20);
    const r = await borrador(cat, 10, null);
    await post(`/api/remisiones/${r.codigo}/cancelar`, operador, {
      motivo: 'Se cayó el puente de la vía',
    }).expect(200);
    expect(await a.prisma.movimiento.count({ where: { remision_id: r.id } })).toBe(0);
    const exc = await get(`/api/acopios/${ACOPIO_A}/excedentes`, operador).expect(200);
    const fila = exc.body.find((e: { categoriaId: string }) => e.categoriaId === cat);
    expect(fila.comprometido).toBe(0);
  });

  it('cancelar en tránsito devuelve el saldo, libera «en camino» y deja las sugerencias aprobadas', async () => {
    const cat = await categoria(50);
    await a.prisma.necesidadManual.create({
      data: {
        zona_id: ZONA_A,
        categoria_id: cat,
        cantidad: 20,
        motivo: 'Necesidad de la prueba de despacho',
        puesta_por: adminId,
      },
    });
    await a.app.get(SugerenciasService).recalcular();
    const s = await a.prisma.sugerencia.findFirstOrThrow({
      where: { categoria_id: cat, estado: 'PROPUESTA' },
    });
    const ap = await post(`/api/sugerencias/${s.id}/aprobar`, admin, { cantidad: 8 }).expect(200);
    const codigo = ap.body.remision.codigo as string;
    await a
      .http()
      .patch(`/api/remisiones/${codigo}`)
      .set(como(operador))
      .send({ responsable: 'Ana' })
      .expect(200);
    await post(`/api/remisiones/${codigo}/despachar`, operador, {}).expect(200);
    const antes = await saldo(cat);
    await post(`/api/remisiones/${codigo}/cancelar`, operador, {
      motivo: 'El conductor no llegó al acopio',
    }).expect(200);
    expect(await saldo(cat)).toBe(antes + 8);
    const aj = await a.prisma.movimiento.findFirstOrThrow({
      where: { remision_id: ap.body.remision.id, tipo: 'AJUSTE' },
    });
    expect(aj.motivo).toBe(`Cancelación de la remisión ${codigo}`);
    expect((await a.prisma.sugerencia.findUniqueOrThrow({ where: { id: s.id } })).estado).toBe(
      'APROBADA',
    );
    const ficha = await get(`/api/zonas/${ZONA_A}/necesidad`, admin).expect(200);
    const enCamino = ficha.body.categorias.find(
      (c: { categoriaId: string }) => c.categoriaId === cat,
    ).enCamino;
    expect(enCamino).toBe(0);
  });

  it('una remisión recibida no se cancela', async () => {
    const cat = await categoria(5);
    const r = await borrador(cat, 1, 'Ana');
    await a.prisma.remision.update({
      where: { id: r.id },
      data: {
        estado: 'RECIBIDA',
        despachada_en: new Date(),
        recibida_en: new Date(),
        evidencia_keys: ['remisiones/prueba.webp'],
      },
    });
    const d = await post(`/api/remisiones/${r.codigo}/cancelar`, operador, {
      motivo: 'Ya no hace falta enviarla',
    }).expect(409);
    expect(d.body.codigo).toBe('REMISION_ESTADO_INVALIDO');
  });

  it('el motivo de cancelación tiene al menos 10 caracteres', async () => {
    const cat = await categoria(5);
    const r = await borrador(cat, 1, null);
    await post(`/api/remisiones/${r.codigo}/cancelar`, operador, { motivo: 'corto' }).expect(400);
  });
});
