import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';
import type { MotivoArchivo } from '../../../generado/prisma/enums';

/** `cierra_el` es una columna `date`: la fecha ISO a medianoche UTC. */
export const comoFecha = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const conEntidadCausa = {
  entidad: {
    select: {
      id: true,
      nombre: true,
      sitio_web: true,
      logo_key: true,
      verificacion: true,
      verificada_en: true,
    },
  },
} as const;
export type FilaCausa = Prisma.CausaGetPayload<{ include: typeof conEntidadCausa }>;

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

  porId(id: string, bd: ClienteBd = this.prisma) {
    return bd.causa.findUnique({ where: { id }, include: conEntidadCausa });
  }

  /** Todas, con su entidad; la web filtra activas y atendidas con las reglas de §4. */
  todas(filtro: Prisma.CausaWhereInput = {}) {
    return this.prisma.causa.findMany({
      where: filtro,
      include: conEntidadCausa,
      orderBy: { publicada_en: 'desc' },
    });
  }

  crear(datos: Prisma.CausaUncheckedCreateInput, bd: ClienteBd) {
    return bd.causa.create({ data: datos, include: conEntidadCausa });
  }

  actualizar(id: string, datos: Prisma.CausaUncheckedUpdateInput, bd: ClienteBd) {
    return bd.causa.update({ where: { id }, data: datos, include: conEntidadCausa });
  }

  archivar(
    id: string,
    datos: { motivo: MotivoArchivo; por: string | null; en: Date },
    bd: ClienteBd,
  ) {
    return bd.causa.update({
      where: { id },
      data: { archivada_en: datos.en, archivo_motivo: datos.motivo, archivada_por: datos.por },
      include: conEntidadCausa,
    });
  }

  /** Sin archivar y con cierre antes de `hoy`: las que archiva la tarea diaria. */
  vencidas(hoy: string, bd: ClienteBd = this.prisma) {
    return bd.causa.findMany({
      where: { archivada_en: null, cierra_el: { lt: comoFecha(hoy) } },
      select: { id: true },
    });
  }
}
