import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { EstadoComprobante, Prisma } from '../../../generado/prisma/client';

export const CON_LINEAS = {
  acopio: { select: { id: true, nombre: true } },
  lineas: {
    include: { categoria: { select: { nombre: true, unidad_base: true, perecedero: true } } },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ComprobanteInclude;

export type ComprobanteConLineas = Prisma.ComprobanteGetPayload<{ include: typeof CON_LINEAS }>;

export interface LineaNueva {
  categoria_id: string;
  ean: string | null;
  contenido_unitario: number;
  cantidad_declarada: number;
  vence_en: Date | null;
}

/**
 * El comprobante con sus líneas y sus vínculos a movimientos (ADR-0019). Los cambios de
 * estado se condicionan al estado leído: `cambiarSiEstado` devuelve cuántas filas cambió.
 */
@Injectable()
export class ComprobanteDao {
  constructor(private readonly prisma: PrismaService) {}

  porFolio(folio: string, bd: ClienteBd = this.prisma) {
    return bd.comprobante.findUnique({ where: { folio }, include: CON_LINEAS });
  }

  conLineas(tx: ClienteBd, id: string) {
    return tx.comprobante.findUniqueOrThrow({ where: { id }, include: CON_LINEAS });
  }

  async estado(tx: ClienteBd, id: string): Promise<EstadoComprobante> {
    const c = await tx.comprobante.findUniqueOrThrow({ where: { id }, select: { estado: true } });
    return c.estado;
  }

  /** Candado por Donador: dos pestañas a la vez no pasan juntas el límite de preparadas. */
  async bloquearPreparadas(tx: ClienteBd, donadorId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'preparadas:' + donadorId}, 0))`;
  }

  contarPreparadas(tx: ClienteBd, donadorId: string) {
    return tx.comprobante.count({ where: { donador_id: donadorId, estado: 'PREPARADO' } });
  }

  crear(
    tx: ClienteBd,
    datos: { folio: string; donadorId: string; acopioId: string; lineas: LineaNueva[] },
  ) {
    return tx.comprobante.create({
      data: {
        folio: datos.folio,
        donador_id: datos.donadorId,
        acopio_id: datos.acopioId,
        lineas: { create: datos.lineas },
      },
      include: CON_LINEAS,
    });
  }

  delDonador(donadorId: string, estado?: EstadoComprobante) {
    return this.prisma.comprobante.findMany({
      where: { donador_id: donadorId, ...(estado ? { estado } : {}) },
      include: CON_LINEAS,
      orderBy: { creado_en: 'desc' },
    });
  }

  async cambiarSiEstado(
    tx: ClienteBd,
    id: string,
    estado: EstadoComprobante,
    data: Prisma.ComprobanteUncheckedUpdateManyInput,
  ): Promise<number> {
    const { count } = await tx.comprobante.updateMany({ where: { id, estado }, data });
    return count;
  }

  actualizarLinea(tx: ClienteBd, lineaId: string, data: Prisma.LineaComprobanteUpdateInput) {
    return tx.lineaComprobante.update({ where: { id: lineaId }, data });
  }

  /** `acopios` null: sin límite de alcance. */
  bandeja(filtro: {
    acopios: string[] | null;
    estado: EstadoComprobante;
    desde?: Date;
    hasta?: Date;
  }) {
    return this.prisma.comprobante.findMany({
      where: {
        ...(filtro.acopios === null ? {} : { acopio_id: { in: filtro.acopios } }),
        estado: filtro.estado,
        creado_en: { gte: filtro.desde, lte: filtro.hasta },
      },
      include: CON_LINEAS,
      orderBy: { creado_en: 'asc' },
      take: 200,
    });
  }

  pendientesPorAcopio(acopios: string[] | null) {
    return this.prisma.comprobante.groupBy({
      by: ['acopio_id'],
      where: {
        ...(acopios === null ? {} : { acopio_id: { in: acopios } }),
        estado: 'PENDIENTE',
      },
      _count: { _all: true },
    });
  }

  /** Solo lo que muestra el seguimiento público: nada del Donador ni de la factura. */
  paraSeguimiento(folio: string) {
    return this.prisma.comprobante.findUnique({
      where: { folio },
      select: {
        folio: true,
        estado: true,
        creado_en: true,
        recibido_en: true,
        verificado_en: true,
        acopio: { select: { nombre: true } },
        lineas: {
          select: {
            cantidad_declarada: true,
            cantidad_confirmada: true,
            contenido_unitario: true,
            categoria: { select: { nombre: true, unidad_base: true } },
          },
          orderBy: { id: 'asc' },
        },
        // RF-CMP-007: lo que salió hacia una zona; las canceladas y los borradores no cuentan
        remisiones: {
          where: { remision: { estado: { in: ['EN_TRANSITO', 'RECIBIDA'] } } },
          select: {
            remision: { select: { estado: true, despachada_en: true, recibida_en: true } },
          },
          orderBy: { vinculado_en: 'asc' },
        },
      },
    });
  }

  preparadasAntesDe(limite: Date) {
    return this.prisma.comprobante.findMany({
      where: { estado: 'PREPARADO', creado_en: { lt: limite } },
      select: { id: true, acopio_id: true },
    });
  }

  conFacturaCerradosAntesDe(limite: Date) {
    return this.prisma.comprobante.findMany({
      where: { cerrado_en: { lt: limite }, factura_key: { not: null } },
      select: { id: true, acopio_id: true, factura_key: true, miniatura_key: true },
      take: 500,
    });
  }

  /** Lee las claves de la factura con la fila bloqueada hasta el final de la transacción. */
  async clavesFacturaBloqueadas(tx: ClienteBd, id: string) {
    const filas = await tx.$queryRaw<
      { factura_key: string | null; miniatura_key: string | null }[]
    >`SELECT factura_key, miniatura_key FROM comprobante WHERE id = ${id}::uuid FOR UPDATE`;
    return filas[0] ?? { factura_key: null, miniatura_key: null };
  }

  quitarFactura(tx: ClienteBd, id: string, ahora: Date) {
    return tx.comprobante.update({
      where: { id },
      data: { factura_key: null, miniatura_key: null, factura_borrada_en: ahora },
    });
  }

  vinculos(comprobanteId: string) {
    return this.prisma.comprobanteMovimiento.findMany({
      where: { comprobante_id: comprobanteId },
      include: {
        movimiento: {
          include: {
            categoria: { select: { nombre: true, unidad_base: true } },
            usuario: { select: { nombre: true } },
          },
        },
      },
      orderBy: { vinculado_en: 'asc' },
    });
  }

  async acopiosVinculados(comprobanteId: string): Promise<(string | null)[]> {
    const filas = await this.prisma.comprobanteMovimiento.findMany({
      where: { comprobante_id: comprobanteId },
      select: { movimiento: { select: { acopio_id: true } } },
    });
    return filas.map((v) => v.movimiento.acopio_id);
  }

  contarVinculos(comprobanteId: string) {
    return this.prisma.comprobanteMovimiento.count({ where: { comprobante_id: comprobanteId } });
  }

  vincular(
    tx: ClienteBd,
    comprobanteId: string,
    movimientoIds: string[],
    datos: { origen: 'RECEPCION' | 'AUDITOR'; usuarioId: string },
  ) {
    return tx.comprobanteMovimiento.createMany({
      data: movimientoIds.map((id) => ({
        comprobante_id: comprobanteId,
        movimiento_id: id,
        origen: datos.origen,
        vinculado_por: datos.usuarioId,
      })),
    });
  }
}
