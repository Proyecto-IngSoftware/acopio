import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { MotivoArchivo } from '../../../generado/prisma/enums';

/** `cierra_el` es una columna `date`: la fecha ISO a medianoche UTC. */
export const comoFecha = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Consultas de `causa` (ADR-0019). */
@Injectable()
export class CausaDao {
  constructor(private readonly prisma: PrismaService) {}

  /** Sin archivar y con cierre desde `hoy`; la verificación de la entidad la revisa quien llama. */
  activasDeEntidad(entidadId: string, hoy: string, bd: ClienteBd) {
    return bd.causa.findMany({
      where: { entidad_id: entidadId, archivada_en: null, cierra_el: { gte: comoFecha(hoy) } },
    });
  }

  /** Causas activas por entidad, para la lista de C15. */
  async contarActivas(hoy: string): Promise<Map<string, number>> {
    const grupos = await this.prisma.causa.groupBy({
      by: ['entidad_id'],
      where: { archivada_en: null, cierra_el: { gte: comoFecha(hoy) } },
      _count: { _all: true },
    });
    return new Map(grupos.map((g) => [g.entidad_id, g._count._all]));
  }

  archivar(
    id: string,
    datos: { motivo: MotivoArchivo; por: string | null; en: Date },
    bd: ClienteBd,
  ) {
    return bd.causa.update({
      where: { id },
      data: { archivada_en: datos.en, archivo_motivo: datos.motivo, archivada_por: datos.por },
    });
  }
}
