import { Injectable } from '@nestjs/common';
import { semaforo } from '@acopio/shared';
import { hoyEnBogota } from '../catalogo/emergencias.service';
import { NoRecibirDao } from './dao/no-recibir.dao';
import { SaldoDao } from './dao/saldo.dao';
import { UmbralDao } from './dao/umbral.dao';

/** Cuántas categorías muestra la portada en cada pestaña. */
const MAXIMO = 6;

export interface FilaBalance {
  categoriaId: string;
  categoria: string;
  acopios: number;
}

/** Cuenta los acopios por categoría y deja primero la que más se repite. */
function agrupar(filas: { categoria_id: string; categoria: { nombre: string } }[]): FilaBalance[] {
  const porCategoria = new Map<string, FilaBalance>();
  for (const f of filas) {
    const actual = porCategoria.get(f.categoria_id);
    if (actual) actual.acopios++;
    else
      porCategoria.set(f.categoria_id, {
        categoriaId: f.categoria_id,
        categoria: f.categoria.nombre,
        acopios: 1,
      });
  }
  return [...porCategoria.values()]
    .sort((a, b) => b.acopios - a.acopios || a.categoria.localeCompare(b.categoria, 'es'))
    .slice(0, MAXIMO);
}

export interface CategoriaNombrada {
  categoriaId: string;
  categoria: string;
}

export interface NecesidadAcopio {
  acopioId: string;
  faltan: CategoriaNombrada[];
  sobran: CategoriaNombrada[];
  alDia: CategoriaNombrada[];
  noRecibe: CategoriaNombrada[];
}

/**
 * «Balance de recepción» de la portada (P-073). Hace falta lo que en algún acopio abierto
 * está por debajo del mínimo, con el mismo semáforo de la consola; no traigan, lo marcado
 * como «no recibir». Solo cuenta acopios: no dice cuáles ni cuánto tienen.
 */
@Injectable()
export class BalanceService {
  constructor(
    private readonly umbrales: UmbralDao,
    private readonly saldos: SaldoDao,
    private readonly marcas: NoRecibirDao,
  ) {}

  async balance() {
    const [umbrales, marcas] = await Promise.all([
      this.umbrales.deAcopiosAbiertos(),
      this.marcas.vigentesAbiertas(hoyEnBogota()),
    ]);
    const saldos = umbrales.length
      ? await this.saldos.deVarios([...new Set(umbrales.map((u) => u.acopio_id))])
      : [];
    const cantidad = new Map(
      saldos.map((s) => [`${s.acopio_id}:${s.categoria_id}`, Number(s.cantidad)]),
    );
    const bajos = umbrales.filter(
      (u) =>
        semaforo(cantidad.get(`${u.acopio_id}:${u.categoria_id}`) ?? 0, {
          minimo: Number(u.minimo),
          maximo: Number(u.maximo),
        }) === 'BAJO',
    );
    return { faltan: agrupar(bajos), noTraigan: agrupar(marcas) };
  }

  /**
   * «Lo que urge» de la ficha de un acopio (RF-RED-003): las categorías bajo el mínimo, con el
   * mismo semáforo. Solo los nombres, sin cantidades. Un id que no existe da la lista vacía.
   */
  async urgente(acopioId: string) {
    const [umbrales, saldos] = await Promise.all([
      this.umbrales.delAcopioConCategoria(acopioId),
      this.saldos.deVarios([acopioId]),
    ]);
    const cantidad = new Map(saldos.map((s) => [s.categoria_id, Number(s.cantidad)]));
    const categorias = umbrales
      .filter(
        (u) =>
          semaforo(cantidad.get(u.categoria_id) ?? 0, {
            minimo: Number(u.minimo),
            maximo: Number(u.maximo),
          }) === 'BAJO',
      )
      .map((u) => ({ categoriaId: u.categoria_id, categoria: u.categoria.nombre }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es'));
    return { categorias };
  }

  /**
   * Necesidades de cada acopio abierto para el mapa: qué falta, qué sobra, qué está al día y qué
   * no recibe, con el mismo semáforo. Solo nombres de categoría, sin cantidades. Un acopio sin
   * umbrales ni marcas vigentes no sale.
   */
  async necesidades(): Promise<NecesidadAcopio[]> {
    const [umbrales, marcas] = await Promise.all([
      this.umbrales.deAcopiosAbiertos(),
      this.marcas.vigentesAbiertas(hoyEnBogota()),
    ]);
    const saldos = umbrales.length
      ? await this.saldos.deVarios([...new Set(umbrales.map((u) => u.acopio_id))])
      : [];
    const cantidad = new Map(
      saldos.map((s) => [`${s.acopio_id}:${s.categoria_id}`, Number(s.cantidad)]),
    );
    const porAcopio = new Map<string, NecesidadAcopio>();
    const de = (acopioId: string) => {
      let fila = porAcopio.get(acopioId);
      if (!fila) {
        fila = { acopioId, faltan: [], sobran: [], alDia: [], noRecibe: [] };
        porAcopio.set(acopioId, fila);
      }
      return fila;
    };
    for (const u of umbrales) {
      const estado = semaforo(cantidad.get(`${u.acopio_id}:${u.categoria_id}`) ?? 0, {
        minimo: Number(u.minimo),
        maximo: Number(u.maximo),
      });
      const fila = de(u.acopio_id);
      const cat = { categoriaId: u.categoria_id, categoria: u.categoria.nombre };
      if (estado === 'BAJO') fila.faltan.push(cat);
      else if (estado === 'SOBRE') fila.sobran.push(cat);
      else fila.alDia.push(cat);
    }
    for (const m of marcas) {
      de(m.acopio_id).noRecibe.push({ categoriaId: m.categoria_id, categoria: m.categoria.nombre });
    }
    const orden = (a: CategoriaNombrada, b: CategoriaNombrada) =>
      a.categoria.localeCompare(b.categoria, 'es');
    return [...porAcopio.values()].map((f) => ({
      acopioId: f.acopioId,
      faltan: f.faltan.sort(orden),
      sobran: f.sobran.sort(orden),
      alDia: f.alDia.sort(orden),
      noRecibe: f.noRecibe.sort(orden),
    }));
  }
}
