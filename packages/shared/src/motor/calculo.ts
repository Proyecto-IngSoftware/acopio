import { vencimientoEstimado, type MovimientoParaVencimiento } from '../inventario.js';

/** Los cuatro pesos del puntaje (RF-MOT-005, RF-CAT-006). Suman 1. */
export interface Pesos {
  criticidad: number;
  urgencia: number;
  proximidad: number;
  magnitud: number;
}
/** Los cuatro componentes de una sugerencia, cada uno entre 0 y 1. */
export type Componentes = Pesos;

export const PESOS_POR_DEFECTO: Pesos = {
  criticidad: 0.45,
  urgencia: 0.25,
  proximidad: 0.15,
  magnitud: 0.15,
};
/** No se proponen traslados menores, en unidad base (RF-MOT-005). */
export const CANTIDAD_MINIMA_POR_DEFECTO = 5;
/** Un par descartado no se vuelve a proponer durante este tiempo (M-04). */
export const BLOQUEO_DESCARTE_HORAS = 24;
/** Un reporte del Receptor se muestra hasta esta antigüedad (M-09). */
export const VIGENCIA_REPORTE_DIAS = 7;
/** Radio del área de una zona en el mapa público (M-09). */
export const RADIO_ZONA_PUBLICA_KM = 3;

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const DIA_MS = 86_400_000;

/** RF-MOT-002: canasta × población × horizonte, en unidad base. */
export function necesidad(cantidadPersonaDia: number, poblacion: number, horizonteDias: number) {
  return r3(cantidadPersonaDia * poblacion * horizonteDias);
}

export interface EstadoZonaCategoria {
  necesidad: number;
  recibido: number;
  enCamino: number;
  deficit: number;
  /** Lo que ya llegó sobre lo necesario, topado en 1 (RF-MOT-003). */
  cobertura: number;
  /** 1 − (recibido + en camino) / necesidad, topado: lo que el motor todavía ve sin cubrir. */
  criticidad: number;
}

/** RF-MOT-003 con M-02 y M-03. Sin necesidad, la categoría no entra al cálculo. */
export function estadoZona(
  necesidad: number,
  recibido: number,
  enCamino: number,
): EstadoZonaCategoria | null {
  if (!(necesidad > 0)) return null;
  return {
    necesidad,
    recibido,
    enCamino,
    deficit: Math.max(0, r3(necesidad - recibido - enCamino)),
    cobertura: Math.min(1, recibido / necesidad),
    criticidad: 1 - Math.min(1, (recibido + enCamino) / necesidad),
  };
}

/** M-11: promedio de las coberturas por categoría, cada una topada en 1. */
export function coberturaGlobal(coberturas: number[]): number | null {
  if (coberturas.length === 0) return null;
  return coberturas.reduce((s, c) => s + Math.min(1, c), 0) / coberturas.length;
}

export interface EntradaAcopioCategoria {
  saldo: number;
  umbral: { minimo: number; maximo: number } | null;
  noRecibe: boolean;
  /** Líneas en BORRADOR que salen de este acopio (M-03). */
  comprometido: number;
  perecedero: boolean;
  /** Movimientos del acopio en la categoría; solo cuentan si es perecedera. */
  movimientos: MovimientoParaVencimiento[];
}

export interface EstadoAcopioCategoria {
  /** Lo que pasa del máximo (RF-MOT-004). */
  superavit: number;
  /** Lo que la estimación de vencimientos da por vencido y sigue en el estante. */
  vencido: number;
  /** Lo que el motor puede proponer sacar. */
  movible: number;
  /** Días hasta lo próximo que vence; null sin fecha. */
  diasParaVencer: number | null;
  aviso: 'SIN_UMBRAL' | null;
}

/** Días de calendario entre dos fechas `YYYY-MM-DD`. */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA_MS);
}

/**
 * RF-MOT-004 con M-03, M-05 y M-12. `hoy` es la fecha de Bogotá en `YYYY-MM-DD`. Los
 * vencimientos salen de la misma estimación que C3 (V-02): lo que vence antes sale primero.
 */
export function estadoAcopio(e: EntradaAcopioCategoria, hoy: string): EstadoAcopioCategoria {
  const lotes = e.perecedero ? vencimientoEstimado(e.movimientos) : [];
  const vencido = r3(
    lotes.filter((l) => l.venceEn !== null && l.venceEn < hoy).reduce((s, l) => s + l.cantidad, 0),
  );
  // vencimientoEstimado ordena por fecha: el primero sin vencer es el más próximo
  const proximo = lotes.find((l) => l.venceEn !== null && l.venceEn >= hoy);
  const diasParaVencer = proximo?.venceEn ? diasEntre(hoy, proximo.venceEn) : null;
  if (!e.umbral) return { superavit: 0, vencido, movible: 0, diasParaVencer, aviso: 'SIN_UMBRAL' };
  const superavit = Math.max(0, r3(e.saldo - e.umbral.maximo));
  const limite = e.noRecibe ? e.umbral.minimo : e.umbral.maximo;
  const movible = Math.max(0, r3(e.saldo - vencido - limite - e.comprometido));
  return { superavit, vencido, movible, diasParaVencer, aviso: null };
}

/** M-05: 1 / (1 + días); 0 sin fecha, que incluye las categorías no perecederas. */
export function urgencia(diasParaVencer: number | null): number {
  return diasParaVencer === null ? 0 : 1 / (1 + Math.max(0, diasParaVencer));
}

export function puntaje(c: Componentes, p: Pesos): number {
  const total =
    p.criticidad * c.criticidad +
    p.urgencia * c.urgencia +
    p.proximidad * c.proximidad +
    p.magnitud * c.magnitud;
  return Math.round(total * 10_000) / 10_000;
}

/** RF-CAT-006: cada peso entre 0 y 1 y la suma igual a 1, con tolerancia de 0,001. */
export function pesosValidos(p: Pesos): boolean {
  const v = [p.criticidad, p.urgencia, p.proximidad, p.magnitud];
  return v.every((x) => x >= 0 && x <= 1) && Math.abs(v.reduce((s, x) => s + x, 0) - 1) <= 0.001;
}
