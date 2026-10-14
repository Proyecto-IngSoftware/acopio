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

  /** Lo que piden los vencimientos estimados de las categorías perecederas. */
  paraVencimientos(acopioId: string, categoriaIds: string[], bd: ClienteBd = this.prisma) {
    return bd.movimiento.findMany({
      where: { acopio_id: acopioId, categoria_id: { in: categoriaIds } },
      select: { categoria_id: true, tipo: true, signo: true, cantidad: true, vence_en: true },
    });
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
    return bd.$queryRaw<FilaHistorial[]>`
      SELECT * FROM (
        SELECT m.*, u.nombre AS usuario_nombre,
               (SUM(m.cantidad * m.signo) OVER (ORDER BY m.secuencia))::text AS saldo_despues
        FROM movimiento m JOIN usuario u ON u.id = m.usuario_id
        WHERE m.acopio_id = ${acopioId}::uuid AND m.categoria_id = ${categoriaId}::uuid
      ) t
      WHERE ${desde === null} OR t.secuencia < ${desde ?? 0n}
      ORDER BY t.secuencia DESC
      LIMIT ${limite}`;
  }
}
