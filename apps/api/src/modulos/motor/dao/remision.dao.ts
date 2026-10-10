import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { EstadoRemision, Prisma } from '../../../generado/prisma/client';

export const CON_LINEAS = {
  acopio_origen: { select: { id: true, nombre: true } },
  zona_destino: { select: { id: true, nombre: true } },
  lineas: {
    include: { categoria: { select: { nombre: true, unidad_base: true } } },
    orderBy: { categoria_id: 'asc' },
  },
  comprobantes: { include: { comprobante: { select: { folio: true } } } },
} satisfies Prisma.RemisionInclude;

export type RemisionConLineas = Prisma.RemisionGetPayload<{ include: typeof CON_LINEAS }>;

/** La remisión con sus líneas y sus folios (ADR-0019). */
@Injectable()
export class RemisionDao {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El borrador del par, con la fila bloqueada hasta el fin de la transacción: un despacho
   * o una cancelación a la vez esperan, y si ganaron, aquí ya no aparece como BORRADOR.
   */
  async borradorDelPar(tx: ClienteBd, acopioId: string, zonaId: string | null) {
    const filas = await tx.$queryRaw<{ id: string; codigo: string }[]>`
      SELECT id, codigo FROM remision
      WHERE estado = 'BORRADOR' AND acopio_origen_id = ${acopioId}::uuid
        AND zona_destino_id IS NOT DISTINCT FROM ${zonaId}::uuid
      ORDER BY creada_en
      LIMIT 1
      FOR UPDATE`;
    return filas[0] ?? null;
  }

  /** Bloquea la fila hasta el fin de la transacción y devuelve su estado de ahora. */
  async bloquear(tx: ClienteBd, id: string): Promise<EstadoRemision | null> {
    const filas = await tx.$queryRaw<{ estado: EstadoRemision }[]>`
      SELECT estado FROM remision WHERE id = ${id}::uuid FOR UPDATE`;
    return filas[0]?.estado ?? null;
  }

  porCodigo(codigo: string, bd: ClienteBd = this.prisma) {
    return bd.remision.findUnique({ where: { codigo }, include: CON_LINEAS });
  }

  porQr(token: string, bd: ClienteBd = this.prisma) {
    return bd.remision.findUnique({ where: { qr_token: token }, include: CON_LINEAS });
  }

  async codigoLibre(tx: ClienteBd, codigo: string) {
    return !(await tx.remision.findUnique({ where: { codigo }, select: { id: true } }));
  }

  crear(
    tx: ClienteBd,
    d: {
      codigo: string;
      acopioId: string;
      zonaId: string | null;
      qrToken: string;
      responsable?: string | null;
      usuarioId: string;
    },
  ) {
    return tx.remision.create({
      data: {
        codigo: d.codigo,
        acopio_origen_id: d.acopioId,
        zona_destino_id: d.zonaId,
        qr_token: d.qrToken,
        responsable: d.responsable ?? null,
        creada_por: d.usuarioId,
      },
      select: { id: true, codigo: true },
    });
  }

  lineaDe(tx: ClienteBd, remisionId: string, categoriaId: string) {
    return tx.lineaRemision.findUnique({
      where: { remision_id_categoria_id: { remision_id: remisionId, categoria_id: categoriaId } },
    });
  }

  crearLinea(tx: ClienteBd, remisionId: string, categoriaId: string, cantidad: number) {
    return tx.lineaRemision.create({
      data: { remision_id: remisionId, categoria_id: categoriaId, cantidad_planeada: cantidad },
    });
  }

  cambiarLinea(tx: ClienteBd, lineaId: string, cantidad: number) {
    return tx.lineaRemision.update({
      where: { id: lineaId },
      data: { cantidad_planeada: cantidad },
    });
  }

  /** Borra las líneas y crea las nuevas. El disparador lo permite solo en BORRADOR. */
  async reemplazarLineas(
    tx: ClienteBd,
    remisionId: string,
    lineas: { categoriaId: string; cantidad: number }[],
  ) {
    await tx.lineaRemision.deleteMany({ where: { remision_id: remisionId } });
    await tx.lineaRemision.createMany({
      data: lineas.map((l) => ({
        remision_id: remisionId,
        categoria_id: l.categoriaId,
        cantidad_planeada: l.cantidad,
      })),
    });
  }

  async cambiarSiEstado(
    tx: ClienteBd,
    id: string,
    estado: EstadoRemision,
    data: Prisma.RemisionUncheckedUpdateManyInput,
  ): Promise<number> {
    const { count } = await tx.remision.updateMany({ where: { id, estado }, data });
    return count;
  }

  /** Lo que este borrador ya compromete, por categoría: se suma al movible al editarlo. */
  async comprometidoPropio(tx: ClienteBd, remisionId: string) {
    const filas = await tx.lineaRemision.findMany({
      where: { remision_id: remisionId, remision: { estado: 'BORRADOR' } },
      select: { categoria_id: true, cantidad_planeada: true },
    });
    return new Map(filas.map((f) => [f.categoria_id, Number(f.cantidad_planeada)]));
  }

  vincularFolios(tx: ClienteBd, remisionId: string, comprobanteIds: string[], usuarioId: string) {
    return tx.remisionComprobante.createMany({
      data: comprobanteIds.map((id) => ({
        remision_id: remisionId,
        comprobante_id: id,
        vinculado_por: usuarioId,
      })),
    });
  }

  /**
   * Agrega una foto de evidencia si la remisión sigue en tránsito y tiene menos de `maximo`.
   * Devuelve las filas cambiadas: 0 si no se pudo.
   */
  agregarEvidencia(tx: ClienteBd, id: string, clave: string, maximo: number): Promise<number> {
    return tx.$executeRaw`
      UPDATE remision SET evidencia_keys = array_append(evidencia_keys, ${clave})
      WHERE id = ${id}::uuid AND estado = 'EN_TRANSITO' AND cardinality(evidencia_keys) < ${maximo}`;
  }

  /** En la confirmación, lo recibido es lo planeado (RF-MOT-009, sin conteo). */
  async marcarRecibidas(tx: ClienteBd, remisionId: string) {
    await tx.$executeRaw`
      UPDATE linea_remision SET cantidad_recibida = cantidad_planeada
      WHERE remision_id = ${remisionId}::uuid`;
  }

  listar(filtro: { acopioIds: string[] | null; estado?: EstadoRemision; zonaId?: string }) {
    return this.prisma.remision.findMany({
      where: {
        ...(filtro.acopioIds === null ? {} : { acopio_origen_id: { in: filtro.acopioIds } }),
        estado: filtro.estado,
        zona_destino_id: filtro.zonaId,
      },
      include: CON_LINEAS,
      orderBy: { creada_en: 'desc' },
      take: 200,
    });
  }

  /** EN_TRANSITO hacia esas zonas, más los despachos generales. null = todas. */
  pendientesParaReceptor(zonaIds: string[] | null) {
    return this.prisma.remision.findMany({
      where: {
        estado: 'EN_TRANSITO',
        ...(zonaIds === null
          ? {}
          : { OR: [{ zona_destino_id: { in: zonaIds } }, { zona_destino_id: null }] }),
      },
      include: CON_LINEAS,
      orderBy: { despachada_en: 'asc' },
    });
  }
}
