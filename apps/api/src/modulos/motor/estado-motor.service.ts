import { Injectable } from '@nestjs/common';
import {
  estadoAcopio,
  necesidad as calcularNecesidad,
  type AcopioMotor,
  type CategoriaMotor,
  type DemandaMotor,
  type OfertaMotor,
  type ZonaMotor,
} from '@acopio/shared';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { Prisma } from '../../generado/prisma/client';
import { hoyEnBogota } from '../catalogo/emergencias.service';

const uuids = (ids: string[]) => Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`));
const dia = (d: Date) => d.toISOString().slice(0, 10);
const clave = (x: string, y: string) => `${x}:${y}`;

export interface ZonaCargada extends ZonaMotor {
  emergenciaId: string;
  horizonteDias: number;
  poblacion: number;
}

export interface DemandaDetallada extends DemandaMotor {
  origen: 'CANASTA' | 'MANUAL';
  cantidadPersonaDia: number | null;
  fuenteCanasta: string | null;
  manual: { cantidad: number; motivo: string; puestaPor: string; puestaEn: Date } | null;
}

export interface OfertaDetallada extends OfertaMotor {
  saldo: number;
  umbral: { minimo: number; maximo: number } | null;
  comprometido: number;
  vencido: number;
  aviso: 'SIN_UMBRAL' | null;
}

/**
 * Lee la base y arma la entrada del cálculo (§5 de la especificación). Recibe el cliente
 * para leer dentro de la transacción de quien llama: aprobar valida con datos frescos.
 */
@Injectable()
export class EstadoMotorService {
  async zonas(cliente: ClienteBd, filtro: { zonaIds?: string[] }): Promise<ZonaCargada[]> {
    const filas = await cliente.zona.findMany({
      where: filtro.zonaIds
        ? { id: { in: filtro.zonaIds } }
        : { emergencia: { estado: { in: ['ACTIVA', 'EN_SEGUIMIENTO'] } } },
      include: { emergencia: { select: { horizonte_dias: true } } },
      orderBy: { nombre: 'asc' },
    });
    return filas.map((z) => ({
      id: z.id,
      nombre: z.nombre,
      lat: Number(z.lat),
      lng: Number(z.lng),
      emergenciaId: z.emergencia_id,
      horizonteDias: z.emergencia.horizonte_dias,
      poblacion: z.poblacion_estimada,
    }));
  }

  async demandas(
    cliente: ClienteBd,
    ahora: Date,
    zonas: ZonaCargada[],
    categoriaIds?: string[],
  ): Promise<DemandaDetallada[]> {
    if (zonas.length === 0) return [];
    const ids = zonas.map((z) => z.id);
    const hoy = dia(hoyEnBogota(ahora));
    const canasta = await cliente.$queryRaw<
      { categoria_id: string; cantidad_persona_dia: Prisma.Decimal; fuente: string }[]
    >`
      SELECT DISTINCT ON (ce.categoria_id) ce.categoria_id, ce.cantidad_persona_dia, ce.fuente
      FROM canasta_estandar ce JOIN categoria c ON c.id = ce.categoria_id
      WHERE ce.vigente_desde <= ${hoy}::date AND NOT c.archivada
      ORDER BY ce.categoria_id, ce.vigente_desde DESC`;
    const manuales = await cliente.$queryRaw<
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
      WHERE n.zona_id IN (${uuids(ids)}) AND NOT c.archivada
      ORDER BY n.zona_id, n.categoria_id, n.puesta_en DESC`;
    // M-02: solo lo que llegó dentro del horizonte de la emergencia de cada zona
    const recibidos = await cliente.$queryRaw<
      { zona_id: string; categoria_id: string; total: Prisma.Decimal }[]
    >`
      SELECT m.zona_id, m.categoria_id, SUM(m.cantidad) AS total
      FROM movimiento m
      JOIN zona z ON z.id = m.zona_id
      JOIN emergencia e ON e.id = z.emergencia_id
      WHERE m.tipo = 'RECEPCION' AND m.zona_id IN (${uuids(ids)})
        AND m.ocurrido_en >= ${ahora}::timestamptz - make_interval(days => e.horizonte_dias)
      GROUP BY m.zona_id, m.categoria_id`;
    // M-03: lo que va en camino, en borrador o en tránsito, con zona fija
    const enCamino = await cliente.$queryRaw<
      { zona_id: string; categoria_id: string; total: Prisma.Decimal }[]
    >`
      SELECT r.zona_destino_id AS zona_id, l.categoria_id, SUM(l.cantidad_planeada) AS total
      FROM linea_remision l JOIN remision r ON r.id = l.remision_id
      WHERE r.estado IN ('BORRADOR', 'EN_TRANSITO') AND r.zona_destino_id IN (${uuids(ids)})
      GROUP BY r.zona_destino_id, l.categoria_id`;

    const rec = new Map(recibidos.map((r) => [clave(r.zona_id, r.categoria_id), Number(r.total)]));
    const cam = new Map(enCamino.map((r) => [clave(r.zona_id, r.categoria_id), Number(r.total)]));
    const man = new Map(manuales.map((m) => [clave(m.zona_id, m.categoria_id), m]));
    const can = new Map(canasta.map((c) => [c.categoria_id, c]));

    const resultado: DemandaDetallada[] = [];
    for (const z of zonas) {
      const categorias = new Set([
        ...canasta.map((c) => c.categoria_id),
        ...manuales.filter((m) => m.zona_id === z.id).map((m) => m.categoria_id),
      ]);
      for (const categoriaId of categorias) {
        if (categoriaIds && !categoriaIds.includes(categoriaId)) continue;
        const m = man.get(clave(z.id, categoriaId));
        const c = can.get(categoriaId);
        const manual =
          m && m.cantidad !== null
            ? {
                cantidad: Number(m.cantidad),
                motivo: m.motivo,
                puestaPor: m.autor,
                puestaEn: m.puesta_en,
              }
            : null;
        if (!manual && !c) continue;
        resultado.push({
          zonaId: z.id,
          categoriaId,
          necesidad: manual
            ? manual.cantidad
            : calcularNecesidad(Number(c!.cantidad_persona_dia), z.poblacion, z.horizonteDias),
          recibido: rec.get(clave(z.id, categoriaId)) ?? 0,
          enCamino: cam.get(clave(z.id, categoriaId)) ?? 0,
          origen: manual ? 'MANUAL' : 'CANASTA',
          cantidadPersonaDia: c ? Number(c.cantidad_persona_dia) : null,
          fuenteCanasta: c?.fuente ?? null,
          manual,
        });
      }
    }
    return resultado;
  }

  async acopios(cliente: ClienteBd, filtro: { acopioIds?: string[] }): Promise<AcopioMotor[]> {
    const filas = await cliente.acopio.findMany({
      where: filtro.acopioIds
        ? { id: { in: filtro.acopioIds } }
        : { estado: { in: ['ACTIVO', 'PAUSADO'] } },
      select: { id: true, nombre: true, lat: true, lng: true },
      orderBy: { nombre: 'asc' },
    });
    return filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      lat: Number(f.lat),
      lng: Number(f.lng),
    }));
  }

  async ofertas(
    cliente: ClienteBd,
    ahora: Date,
    acopios: AcopioMotor[],
    categoriaIds?: string[],
  ): Promise<OfertaDetallada[]> {
    if (acopios.length === 0) return [];
    const ids = acopios.map((a) => a.id);
    const hoyFecha = hoyEnBogota(ahora);
    const hoy = dia(hoyFecha);
    const porCategoria = categoriaIds ? { in: categoriaIds } : undefined;
    const saldos = await cliente.saldo.findMany({
      where: { acopio_id: { in: ids }, categoria_id: porCategoria },
    });
    const umbrales = await cliente.umbral.findMany({
      where: { acopio_id: { in: ids }, categoria_id: porCategoria },
    });
    const noRecibir = await cliente.noRecibir.findMany({
      where: {
        acopio_id: { in: ids },
        categoria_id: porCategoria,
        OR: [{ hasta: null }, { hasta: { gte: hoyFecha } }],
      },
      select: { acopio_id: true, categoria_id: true },
    });
    const comprometidos = await cliente.$queryRaw<
      { acopio_id: string; categoria_id: string; total: Prisma.Decimal }[]
    >`
      SELECT r.acopio_origen_id AS acopio_id, l.categoria_id, SUM(l.cantidad_planeada) AS total
      FROM linea_remision l JOIN remision r ON r.id = l.remision_id
      WHERE r.estado = 'BORRADOR' AND r.acopio_origen_id IN (${uuids(ids)})
      GROUP BY r.acopio_origen_id, l.categoria_id`;

    const pares = new Map<string, { acopioId: string; categoriaId: string }>();
    for (const f of [...saldos, ...umbrales])
      pares.set(clave(f.acopio_id, f.categoria_id), {
        acopioId: f.acopio_id,
        categoriaId: f.categoria_id,
      });
    const categorias = await cliente.categoria.findMany({
      where: { id: { in: [...new Set([...pares.values()].map((p) => p.categoriaId))] } },
      select: { id: true, perecedero: true },
    });
    const perecederas = categorias.filter((c) => c.perecedero).map((c) => c.id);
    const movimientos = perecederas.length
      ? await cliente.movimiento.findMany({
          where: { acopio_id: { in: ids }, categoria_id: { in: perecederas } },
          select: {
            acopio_id: true,
            categoria_id: true,
            tipo: true,
            signo: true,
            cantidad: true,
            vence_en: true,
          },
        })
      : [];

    const saldo = new Map(
      saldos.map((s) => [clave(s.acopio_id, s.categoria_id), Number(s.cantidad)]),
    );
    const umbral = new Map(
      umbrales.map((u) => [
        clave(u.acopio_id, u.categoria_id),
        { minimo: Number(u.minimo), maximo: Number(u.maximo) },
      ]),
    );
    const noRecibe = new Set(noRecibir.map((n) => clave(n.acopio_id, n.categoria_id)));
    const comprometido = new Map(
      comprometidos.map((c) => [clave(c.acopio_id, c.categoria_id), Number(c.total)]),
    );

    return [...pares.values()].map(({ acopioId, categoriaId }) => {
      const k = clave(acopioId, categoriaId);
      const e = {
        saldo: saldo.get(k) ?? 0,
        umbral: umbral.get(k) ?? null,
        noRecibe: noRecibe.has(k),
        comprometido: comprometido.get(k) ?? 0,
      };
      const calculo = estadoAcopio(
        {
          ...e,
          perecedero: perecederas.includes(categoriaId),
          movimientos: movimientos
            .filter((m) => m.acopio_id === acopioId && m.categoria_id === categoriaId)
            .filter(
              (m): m is typeof m & { tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' } =>
                m.tipo !== 'RECEPCION',
            )
            .map((m) => ({
              tipo: m.tipo,
              signo: m.signo as 1 | -1,
              cantidad: Number(m.cantidad),
              venceEn: m.vence_en ? dia(m.vence_en) : null,
            })),
        },
        hoy,
      );
      return { acopioId, categoriaId, ...e, ...calculo };
    });
  }

  async categorias(cliente: ClienteBd, ids: string[]): Promise<CategoriaMotor[]> {
    const filas = await cliente.categoria.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, nombre: true, unidad_base: true },
      orderBy: { nombre: 'asc' },
    });
    return filas.map((c) => ({ id: c.id, nombre: c.nombre, unidad: c.unidad_base }));
  }
}
