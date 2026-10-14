import { Injectable } from '@nestjs/common';
import { VIGENCIA_REPORTE_DIAS } from '@acopio/shared';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import { Prisma } from '../../../generado/prisma/client';

const uuids = (ids: string[]) => Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`));

/** Canasta, necesidad manual, lo recibido y lo que va en camino, y los reportes (ADR-0019). */
@Injectable()
export class NecesidadDao {
  constructor(private readonly prisma: PrismaService) {}

  /** La canasta vigente hoy de cada categoría no archivada. `hoy` es AAAA-MM-DD. */
  canastaVigente(bd: ClienteBd, hoy: string) {
    return bd.$queryRaw<
      { categoria_id: string; cantidad_persona_dia: Prisma.Decimal; fuente: string }[]
    >`
      SELECT DISTINCT ON (ce.categoria_id) ce.categoria_id, ce.cantidad_persona_dia, ce.fuente
      FROM canasta_estandar ce JOIN categoria c ON c.id = ce.categoria_id
      WHERE ce.vigente_desde <= ${hoy}::date AND NOT c.archivada
      ORDER BY ce.categoria_id, ce.vigente_desde DESC`;
  }

  /** La necesidad manual más reciente de cada zona y categoría. */
  manualesVigentes(bd: ClienteBd, zonaIds: string[]) {
    return bd.$queryRaw<
      {
        zona_id: string;
        categoria_id: string;
        cantidad: Prisma.Decimal | null;
        motivo: string;
        puesta_en: Date;
        autor: string;
      }[]
    >`
      SELECT DISTINCT ON (n.zona_id, n.categoria_id)
             n.zona_id, n.categoria_id, n.cantidad, n.motivo, n.puesta_en, u.nombre AS autor
      FROM necesidad_manual n
      JOIN usuario u ON u.id = n.puesta_por
      JOIN categoria c ON c.id = n.categoria_id
      WHERE n.zona_id IN (${uuids(zonaIds)}) AND NOT c.archivada
      ORDER BY n.zona_id, n.categoria_id, n.puesta_en DESC`;
  }

  /** M-02: solo lo que llegó dentro del horizonte de la emergencia de cada zona. */
  recibidosEnVentana(bd: ClienteBd, zonaIds: string[], ahora: Date) {
    return bd.$queryRaw<{ zona_id: string; categoria_id: string; total: Prisma.Decimal }[]>`
      SELECT m.zona_id, m.categoria_id, SUM(m.cantidad) AS total
      FROM movimiento m
      JOIN zona z ON z.id = m.zona_id
      JOIN emergencia e ON e.id = z.emergencia_id
      WHERE m.tipo = 'RECEPCION' AND m.zona_id IN (${uuids(zonaIds)})
        AND m.ocurrido_en >= ${ahora}::timestamptz - make_interval(days => e.horizonte_dias)
      GROUP BY m.zona_id, m.categoria_id`;
  }

  /** M-03: lo que va en camino, en borrador o en tránsito, con zona fija. */
  enCamino(bd: ClienteBd, zonaIds: string[]) {
    return bd.$queryRaw<{ zona_id: string; categoria_id: string; total: Prisma.Decimal }[]>`
      SELECT r.zona_destino_id AS zona_id, l.categoria_id, SUM(l.cantidad_planeada) AS total
      FROM linea_remision l JOIN remision r ON r.id = l.remision_id
      WHERE r.estado IN ('BORRADOR', 'EN_TRANSITO') AND r.zona_destino_id IN (${uuids(zonaIds)})
      GROUP BY r.zona_destino_id, l.categoria_id`;
  }

  /** M-03: lo que los borradores ya comprometen en cada acopio. */
  comprometidoEnBorradores(bd: ClienteBd, acopioIds: string[]) {
    return bd.$queryRaw<{ acopio_id: string; categoria_id: string; total: Prisma.Decimal }[]>`
      SELECT r.acopio_origen_id AS acopio_id, l.categoria_id, SUM(l.cantidad_planeada) AS total
      FROM linea_remision l JOIN remision r ON r.id = l.remision_id
      WHERE r.estado = 'BORRADOR' AND r.acopio_origen_id IN (${uuids(acopioIds)})
      GROUP BY r.acopio_origen_id, l.categoria_id`;
  }

  /** RF-MOT-011: el último reporte de cada categoría, si no está resuelto y es reciente. */
  reportesVigentes(zonaId: string, ahora: Date) {
    return this.prisma.$queryRaw<
      { categoria_id: string; categoria: string; nota: string | null; reportado_en: Date }[]
    >`
      SELECT t.categoria_id, t.categoria, t.nota, t.reportado_en FROM (
        SELECT DISTINCT ON (r.categoria_id)
               r.categoria_id, c.nombre AS categoria, r.nota, r.resuelta, r.reportado_en
        FROM reporte_necesidad r JOIN categoria c ON c.id = r.categoria_id
        WHERE r.zona_id = ${zonaId}::uuid
        ORDER BY r.categoria_id, r.reportado_en DESC
      ) t
      WHERE NOT t.resuelta
        AND t.reportado_en >= ${ahora}::timestamptz - make_interval(days => ${VIGENCIA_REPORTE_DIAS}::int)
      ORDER BY t.reportado_en DESC`;
  }

  ultimaManual(tx: ClienteBd, zonaId: string, categoriaId: string) {
    return tx.necesidadManual.findFirst({
      where: { zona_id: zonaId, categoria_id: categoriaId },
      orderBy: { puesta_en: 'desc' },
    });
  }

  crearManual(
    tx: ClienteBd,
    d: {
      zonaId: string;
      categoriaId: string;
      cantidad: number | null;
      motivo: string;
      usuarioId: string;
    },
  ) {
    return tx.necesidadManual.create({
      data: {
        zona_id: d.zonaId,
        categoria_id: d.categoriaId,
        cantidad: d.cantidad,
        motivo: d.motivo,
        puesta_por: d.usuarioId,
        puesta_en: new Date(),
      },
    });
  }
}
