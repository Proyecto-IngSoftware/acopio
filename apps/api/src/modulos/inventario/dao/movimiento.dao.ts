import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Movimiento, Prisma } from '../../../generado/prisma/client';

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
