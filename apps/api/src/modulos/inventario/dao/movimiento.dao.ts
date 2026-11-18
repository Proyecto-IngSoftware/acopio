import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import { Prisma, type Movimiento } from '../../../generado/prisma/client';

export type FilaHistorial = Movimiento & { usuario_nombre: string; saldo_despues: string };

/** `movimiento` es append-only para acopio_app: este DAO solo inserta y lee (ADR-0002). */
@Injectable()
export class MovimientoDao {
  constructor(private readonly prisma: PrismaService) {}

  buscar(id: string, bd: ClienteBd = this.prisma) {
    return bd.movimiento.findUnique({ where: { id } });
  }

  crear(tx: ClienteBd, datos: Prisma.MovimientoUncheckedCreateInput) {
    return tx.movimiento.create({ data: datos });
  }

  /** Entradas de un acopio registradas desde `desde` que no son de ninguna donación. */
  entradasSinVincular(acopioId: string, desde: Date) {
    return this.prisma.movimiento.findMany({
      where: { acopio_id: acopioId, tipo: 'ENTRADA', vinculo: null, registrado_en: { gte: desde } },
      include: {
        categoria: { select: { nombre: true, unidad_base: true } },
        usuario: { select: { nombre: true } },
      },
      orderBy: { secuencia: 'desc' },
      take: 100,
    });
  }

  /** Los movimientos pedidos, cada uno con su vínculo a una donación si lo tiene. */
  conVinculo(ids: string[]) {
    return this.prisma.movimiento.findMany({
      where: { id: { in: ids } },
      include: { vinculo: true },
    });
  }

  /**
   * Por acopio, categoría y lote: lo que entró con cada fecha y, aparte, lo que salió.
   * `vencimientoEstimado` solo suma por fecha y resta lo consumido, así que basta con estos
   * totales en vez del historial completo.
   */
  lotesPerecederos(acopioIds: string[], categoriaIds: string[], bd: ClienteBd = this.prisma) {
    const uuids = (ids: string[]) => Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`));
    return bd.$queryRaw<
      {
        acopio_id: string;
        categoria_id: string;
        signo: number;
        entrada: boolean;
        vence_en: Date | null;
        total: Prisma.Decimal;
      }[]
    >`
      SELECT acopio_id, categoria_id, signo, (tipo = 'ENTRADA') AS entrada,
             CASE WHEN tipo = 'ENTRADA' THEN vence_en END AS vence_en,
             SUM(cantidad) AS total
      FROM movimiento
      WHERE acopio_id IN (${uuids(acopioIds)}) AND categoria_id IN (${uuids(categoriaIds)})
      GROUP BY 1, 2, 3, 4, 5`;
  }

  /**
   * Una página del historial de una categoría, de la más nueva a la más vieja, con el
   * saldo después de cada fila. `desde` es la secuencia de la última fila ya mostrada.
   */
  historial(
    acopioId: string,
    categoriaId: string,
    desde: bigint | null,
    limite: number,
    bd: ClienteBd = this.prisma,
  ) {
    const cursor = desde === null ? Prisma.empty : Prisma.sql`AND secuencia < ${desde}`;
    return bd.$queryRaw<FilaHistorial[]>`
      WITH pagina AS (
        SELECT *
        FROM movimiento
        WHERE acopio_id = ${acopioId}::uuid AND categoria_id = ${categoriaId}::uuid ${cursor}
        ORDER BY secuencia DESC
        LIMIT ${limite}
      ), ultima_secuencia AS (
        SELECT MAX(secuencia) AS secuencia FROM pagina
      ), base AS MATERIALIZED (
        SELECT s.cantidad
          - COALESCE((
            SELECT SUM(b.variacion)
            FROM saldo_historial_bloque b
            WHERE b.acopio_id = s.acopio_id AND b.categoria_id = s.categoria_id
              AND b.bloque > p.secuencia / 1024
          ), 0)
          - COALESCE((
            SELECT SUM(m.cantidad * m.signo)
            FROM movimiento m
            WHERE m.acopio_id = s.acopio_id AND m.categoria_id = s.categoria_id
              AND m.secuencia > p.secuencia AND m.secuencia <= (p.secuencia / 1024) * 1024 + 1023
          ), 0) AS cantidad
        FROM ultima_secuencia p
        JOIN saldo s ON s.acopio_id = ${acopioId}::uuid AND s.categoria_id = ${categoriaId}::uuid
        WHERE p.secuencia IS NOT NULL
      )
      SELECT m.*, u.nombre AS usuario_nombre, (
        base.cantidad - COALESCE(SUM(m.cantidad * m.signo) OVER (
          ORDER BY m.secuencia DESC ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ), 0)
      )::text AS saldo_despues
      FROM pagina m JOIN usuario u ON u.id = m.usuario_id CROSS JOIN base
      ORDER BY m.secuencia DESC`;
  }
}
