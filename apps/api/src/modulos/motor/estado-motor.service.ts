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
import { AcopioDao } from '../acopios/dao/acopio.dao';
import { ZonaDao } from '../acopios/dao/zona.dao';
import { CategoriaDao } from '../catalogo/dao/categoria.dao';
import { hoyEnBogota } from '../catalogo/emergencias.service';
import { MovimientoDao } from '../inventario/dao/movimiento.dao';
import { NoRecibirDao } from '../inventario/dao/no-recibir.dao';
import { SaldoDao } from '../inventario/dao/saldo.dao';
import { UmbralDao } from '../inventario/dao/umbral.dao';
import { NecesidadDao } from './dao/necesidad.dao';

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
  constructor(
    private readonly zonasDao: ZonaDao,
    private readonly acopiosDao: AcopioDao,
    private readonly categoriasDao: CategoriaDao,
    private readonly necesidades: NecesidadDao,
    private readonly saldos: SaldoDao,
    private readonly umbrales: UmbralDao,
    private readonly noRecibir: NoRecibirDao,
    private readonly movimientos: MovimientoDao,
  ) {}

  async zonas(cliente: ClienteBd, filtro: { zonaIds?: string[] }): Promise<ZonaCargada[]> {
    const filas = await this.zonasDao.paraMotor(cliente, filtro.zonaIds);
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
    const canasta = await this.necesidades.canastaVigente(cliente, dia(hoyEnBogota(ahora)));
    const manuales = await this.necesidades.manualesVigentes(cliente, ids);
    const recibidos = await this.necesidades.recibidosEnVentana(cliente, ids, ahora);
    const enCamino = await this.necesidades.enCamino(cliente, ids);

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
    const filas = await this.acopiosDao.paraMotor(cliente, filtro.acopioIds);
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
    const saldos = await this.saldos.deVarios(ids, categoriaIds, cliente);
    const umbrales = await this.umbrales.deVarios(ids, categoriaIds, cliente);
    const noRecibir = await this.noRecibir.vigentesDeVarios(ids, categoriaIds, hoyFecha, cliente);
    const comprometidos = await this.necesidades.comprometidoEnBorradores(cliente, ids);

    const pares = new Map<string, { acopioId: string; categoriaId: string }>();
    for (const f of [...saldos, ...umbrales])
      pares.set(clave(f.acopio_id, f.categoria_id), {
        acopioId: f.acopio_id,
        categoriaId: f.categoria_id,
      });
    const categorias = await this.categoriasDao.basicas(
      [...new Set([...pares.values()].map((p) => p.categoriaId))],
      cliente,
    );
    const perecederas = categorias.filter((c) => c.perecedero).map((c) => c.id);
    // Totales por lote en SQL, no el historial completo (menor de la etapa 1)
    const lotes = perecederas.length
      ? await this.movimientos.lotesPerecederos(ids, perecederas, cliente)
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
          movimientos: lotes
            .filter((l) => l.acopio_id === acopioId && l.categoria_id === categoriaId)
            .map((l) => ({
              tipo: l.entrada
                ? ('ENTRADA' as const)
                : l.signo === 1
                  ? ('AJUSTE' as const)
                  : ('SALIDA' as const),
              signo: l.signo as 1 | -1,
              cantidad: Number(l.total),
              venceEn: l.vence_en ? dia(l.vence_en) : null,
            })),
        },
        hoy,
      );
      return { acopioId, categoriaId, ...e, ...calculo };
    });
  }

  async categorias(cliente: ClienteBd, ids: string[]): Promise<CategoriaMotor[]> {
    const filas = await this.categoriasDao.basicas(ids, cliente);
    return filas.map((c) => ({ id: c.id, nombre: c.nombre, unidad: c.unidad_base }));
  }
}
