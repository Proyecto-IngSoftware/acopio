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
}
