import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';

/** Consultas de `canasta_estandar` (ADR-0019). */
@Injectable()
export class CanastaDao {
  constructor(private readonly prisma: PrismaService) {}

  /** La última versión vigente en `fecha` de cada categoría no archivada. */
  vigente(fecha: Date) {
    return this.prisma.$queryRaw<
      {
        categoria_id: string;
        categoria: string;
        unidad_base: string;
        cantidad_persona_dia: Prisma.Decimal;
        fuente: string;
        vigente_desde: Date;
      }[]
    >`
      SELECT DISTINCT ON (ce.categoria_id)
             ce.categoria_id, c.nombre AS categoria, c.unidad_base,
             ce.cantidad_persona_dia, ce.fuente, ce.vigente_desde
      FROM canasta_estandar ce
      JOIN categoria c ON c.id = ce.categoria_id
      WHERE ce.vigente_desde <= ${fecha}::date AND NOT c.archivada
      ORDER BY ce.categoria_id, ce.vigente_desde DESC`;
  }

  historial(categoriaId: string) {
    return this.prisma.canastaEstandar.findMany({
      where: { categoria_id: categoriaId },
      orderBy: { vigente_desde: 'desc' },
    });
  }

  crear(datos: Prisma.CanastaEstandarUncheckedCreateInput, bd: ClienteBd) {
    return bd.canastaEstandar.create({ data: datos });
  }
}
