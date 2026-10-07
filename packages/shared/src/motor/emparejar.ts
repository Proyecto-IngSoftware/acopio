import { distanciaKm } from '../distancia.js';
import type { UnidadBase } from '../unidades.js';
import { puntaje, urgencia, type Componentes, type Pesos } from './calculo.js';
import { justificar } from './justificar.js';

export interface ZonaMotor {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
}
export interface AcopioMotor {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
}
export interface CategoriaMotor {
  id: string;
  nombre: string;
  unidad: UnidadBase;
}
export interface DemandaMotor {
  zonaId: string;
  categoriaId: string;
  necesidad: number;
  recibido: number;
  enCamino: number;
}
export interface OfertaMotor {
  acopioId: string;
  categoriaId: string;
  movible: number;
  superavit: number;
  noRecibe: boolean;
  diasParaVencer: number | null;
}
export interface EntradaMotor {
  zonas: ZonaMotor[];
  acopios: AcopioMotor[];
  categorias: CategoriaMotor[];
  demandas: DemandaMotor[];
  ofertas: OfertaMotor[];
  /** Pares descartados hace menos de 24 horas, con `clavePar` (M-04). */
  bloqueados?: ReadonlySet<string>;
}
export interface SugerenciaCalculada {
  acopioId: string;
  zonaId: string;
  categoriaId: string;
  cantidad: number;
  puntaje: number;
  desglose: Componentes;
  justificacion: string;
}

export const clavePar = (acopioId: string, zonaId: string, categoriaId: string) =>
  `${acopioId}:${zonaId}:${categoriaId}`;

const r3 = (n: number) => Math.round(n * 1000) / 1000;

interface Candidata {
  sugerencia: SugerenciaCalculada;
  zona: string;
  acopio: string;
}

/** Puntaje mayor, luego cantidad mayor, luego zona y acopio por nombre: orden estable (M-04). */
const antes = (x: Candidata, y: Candidata) =>
  y.sugerencia.puntaje - x.sugerencia.puntaje ||
  y.sugerencia.cantidad - x.sugerencia.cantidad ||
  x.zona.localeCompare(y.zona, 'es') ||
  x.acopio.localeCompare(y.acopio, 'es') ||
  x.sugerencia.zonaId.localeCompare(y.sugerencia.zonaId) ||
  x.sugerencia.acopioId.localeCompare(y.sugerencia.acopioId);

/**
 * M-06: voraz por puntaje. En cada categoría se puntúan todos los pares acopio y zona, se
 * toma el mejor, se le asigna min(movible, déficit), se descuenta de los dos lados y se
 * repite hasta que no quede un par que alcance la cantidad mínima.
 */
export function emparejar(
  entrada: EntradaMotor,
  pesos: Pesos,
  minimo: number,
): SugerenciaCalculada[] {
  const zonas = new Map(entrada.zonas.map((z) => [z.id, z]));
  const acopios = new Map(entrada.acopios.map((a) => [a.id, a]));
  const bloqueados = entrada.bloqueados ?? new Set<string>();
  const distancias = new Map<string, number>();
  const km = (a: AcopioMotor, z: ZonaMotor) => {
    const clave = `${a.id}:${z.id}`;
    let d = distancias.get(clave);
    if (d === undefined) distancias.set(clave, (d = distanciaKm(a, z)));
    return d;
  };

  // distancia_max: la mayor entre los pares candidatos de la ronda (M-06)
  let distanciaMax = 0;
  for (const d of entrada.demandas) {
    const z = zonas.get(d.zonaId);
    if (!z || d.necesidad - d.recibido - d.enCamino <= 0) continue;
    for (const o of entrada.ofertas) {
      const a = acopios.get(o.acopioId);
      if (a && o.categoriaId === d.categoriaId && o.movible > 0)
        distanciaMax = Math.max(distanciaMax, km(a, z));
    }
  }

  const elegidas: Candidata[] = [];
  for (const cat of entrada.categorias) {
    const demandas = entrada.demandas
      .filter((d) => d.categoriaId === cat.id && zonas.has(d.zonaId))
      .map((d) => ({ ...d, asignado: 0 }));
    const ofertas = entrada.ofertas
      .filter((o) => o.categoriaId === cat.id && acopios.has(o.acopioId))
      .map((o) => ({ ...o, restante: o.movible }));

    for (;;) {
      let mejor:
        (Candidata & { d: (typeof demandas)[number]; o: (typeof ofertas)[number] }) | null = null;
      for (const d of demandas) {
        const deficit = r3(d.necesidad - d.recibido - d.enCamino - d.asignado);
        if (deficit <= 0) continue;
        const z = zonas.get(d.zonaId)!;
        for (const o of ofertas) {
          if (o.restante <= 0 || bloqueados.has(clavePar(o.acopioId, d.zonaId, cat.id))) continue;
          const bruta = Math.min(o.restante, deficit);
          const cantidad = cat.unidad === 'UNIDAD' ? Math.floor(bruta) : r3(bruta);
          if (cantidad <= 0 || cantidad < minimo) continue;
          const a = acopios.get(o.acopioId)!;
          const distancia = km(a, z);
          const cubierto = Math.min(1, (d.recibido + d.enCamino + d.asignado) / d.necesidad);
          const desglose: Componentes = {
            criticidad: 1 - cubierto,
            urgencia: urgencia(o.diasParaVencer),
            proximidad: distanciaMax > 0 ? 1 - distancia / distanciaMax : 1,
            magnitud: Math.min(1, o.restante / deficit),
          };
          const candidata = {
            d,
            o,
            zona: z.nombre,
            acopio: a.nombre,
            sugerencia: {
              acopioId: a.id,
              zonaId: z.id,
              categoriaId: cat.id,
              cantidad,
              puntaje: puntaje(desglose, pesos),
              desglose,
              justificacion: justificar({
                zona: z.nombre,
                categoria: cat.nombre,
                unidad: cat.unidad,
                cobertura: cubierto,
                acopio: a.nombre,
                noRecibe: o.noRecibe,
                superavit: o.superavit,
                movible: o.restante,
                km: distancia,
                diasParaVencer: o.diasParaVencer,
              }),
            },
          };
          if (!mejor || antes(candidata, mejor) < 0) mejor = candidata;
        }
      }
      if (!mejor) break;
      elegidas.push({ sugerencia: mejor.sugerencia, zona: mejor.zona, acopio: mejor.acopio });
      mejor.d.asignado = r3(mejor.d.asignado + mejor.sugerencia.cantidad);
      mejor.o.restante = r3(mejor.o.restante - mejor.sugerencia.cantidad);
    }
  }
  return elegidas.sort(antes).map((c) => c.sugerencia);
}
