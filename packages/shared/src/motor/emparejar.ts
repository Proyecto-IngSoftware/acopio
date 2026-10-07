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

/** El mismo orden que `antes`, sin armar la sugerencia: se usa dentro del ciclo caliente. */
const antesQue = (
  x: { puntaje: number; cantidad: number; zona: ZonaMotor; acopio: AcopioMotor },
  y: { puntaje: number; cantidad: number; zona: ZonaMotor; acopio: AcopioMotor },
) =>
  (y.puntaje - x.puntaje ||
    y.cantidad - x.cantidad ||
    x.zona.nombre.localeCompare(y.zona.nombre, 'es') ||
    x.acopio.nombre.localeCompare(y.acopio.nombre, 'es') ||
    x.zona.id.localeCompare(y.zona.id) ||
    x.acopio.id.localeCompare(y.acopio.id)) < 0;

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
  // Distancias por índice: una búsqueda por texto en cada candidato pesaba más que el cálculo
  const indiceZona = new Map(entrada.zonas.map((z, i) => [z.id, i]));
  const indiceAcopio = new Map(entrada.acopios.map((a, i) => [a.id, i]));
  const distancias = new Float64Array(entrada.zonas.length * entrada.acopios.length).fill(-1);
  const km = (a: AcopioMotor, z: ZonaMotor) => {
    const k = indiceZona.get(z.id)! * entrada.acopios.length + indiceAcopio.get(a.id)!;
    if (distancias[k]! < 0) distancias[k] = distanciaKm(a, z);
    return distancias[k]!;
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
  // Un solo objeto para los componentes de cada candidato; se copia solo el del elegido
  const tmp: Componentes = { criticidad: 0, urgencia: 0, proximidad: 0, magnitud: 0 };
  for (const cat of entrada.categorias) {
    const demandas = entrada.demandas
      .filter((d) => d.categoriaId === cat.id && zonas.has(d.zonaId))
      .map((d) => ({ ...d, asignado: 0 }));
    const ofertas = entrada.ofertas
      .filter((o) => o.categoriaId === cat.id && acopios.has(o.acopioId))
      .map((o) => ({
        ...o,
        restante: o.movible,
        urgencia: urgencia(o.diasParaVencer),
        acopio: acopios.get(o.acopioId)!,
        // Zonas a las que este acopio no puede proponer: descartadas hace menos de 24 horas
        bloqueadas: new Set(
          entrada.zonas
            .filter((z) => bloqueados.has(clavePar(o.acopioId, z.id, cat.id)))
            .map((z) => z.id),
        ),
      }));

    for (;;) {
      // Solo se arma la sugerencia completa, con su frase, para el par elegido: con 50
      // zonas, 20 acopios y 40 categorías hay millones de candidatos por ronda (RF-MOT-005)
      let mejor: {
        d: (typeof demandas)[number];
        o: (typeof ofertas)[number];
        z: ZonaMotor;
        a: AcopioMotor;
        cantidad: number;
        distancia: number;
        cubierto: number;
        desglose: Componentes;
        puntaje: number;
      } | null = null;
      for (const d of demandas) {
        const deficit = r3(d.necesidad - d.recibido - d.enCamino - d.asignado);
        if (deficit <= 0) continue;
        const z = zonas.get(d.zonaId)!;
        const cubierto = Math.min(1, (d.recibido + d.enCamino + d.asignado) / d.necesidad);
        for (const o of ofertas) {
          if (o.restante <= 0 || o.bloqueadas.has(d.zonaId)) continue;
          const bruta = Math.min(o.restante, deficit);
          const cantidad = cat.unidad === 'UNIDAD' ? Math.floor(bruta) : r3(bruta);
          if (cantidad <= 0 || cantidad < minimo) continue;
          const a = o.acopio;
          const distancia = km(a, z);
          tmp.criticidad = 1 - cubierto;
          tmp.urgencia = o.urgencia;
          tmp.proximidad = distanciaMax > 0 ? 1 - distancia / distanciaMax : 1;
          tmp.magnitud = Math.min(1, o.restante / deficit);
          const p = puntaje(tmp, pesos);
          if (
            !mejor ||
            antesQue(
              { puntaje: p, cantidad, zona: z, acopio: a },
              { puntaje: mejor.puntaje, cantidad: mejor.cantidad, zona: mejor.z, acopio: mejor.a },
            )
          ) {
            mejor = { d, o, z, a, cantidad, distancia, cubierto, desglose: { ...tmp }, puntaje: p };
          }
        }
      }
      if (!mejor) break;
      const { d, o, z, a } = mejor;
      elegidas.push({
        zona: z.nombre,
        acopio: a.nombre,
        sugerencia: {
          acopioId: a.id,
          zonaId: z.id,
          categoriaId: cat.id,
          cantidad: mejor.cantidad,
          puntaje: mejor.puntaje,
          desglose: mejor.desglose,
          justificacion: justificar({
            zona: z.nombre,
            categoria: cat.nombre,
            unidad: cat.unidad,
            cobertura: Math.min(1, d.recibido / d.necesidad),
            acopio: a.nombre,
            noRecibe: o.noRecibe,
            superavit: o.superavit,
            movible: o.restante,
            km: mejor.distancia,
            diasParaVencer: o.diasParaVencer,
          }),
        },
      });
      d.asignado = r3(d.asignado + mejor.cantidad);
      o.restante = r3(o.restante - mejor.cantidad);
    }
  }
  return elegidas.sort(antes).map((c) => c.sugerencia);
}
