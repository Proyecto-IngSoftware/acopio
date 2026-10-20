import { formatearNumero } from './formato.js';
import { SIMBOLO_UNIDAD, type UnidadBase } from './unidades.js';

/** Topes de cantidad: lo que cabe en una presentación y en una línea de acopio. */
export const TOPES: { presentacion: Record<UnidadBase, number>; linea: number } = {
  presentacion: { KILOGRAMO: 50, LITRO: 50, UNIDAD: 1000 },
  linea: 10_000,
};

/** Unidades en que se puede escribir una cantidad, con su factor hacia la unidad base. */
export const UNIDADES_DE_ENTRADA: Record<UnidadBase, { simbolo: string; factor: number }[]> = {
  KILOGRAMO: [
    { simbolo: 'kg', factor: 1 },
    { simbolo: 'g', factor: 0.001 },
  ],
  LITRO: [
    { simbolo: 'L', factor: 1 },
    { simbolo: 'ml', factor: 0.001 },
  ],
  UNIDAD: [{ simbolo: 'und.', factor: 1 }],
};

// Igual que apps/api/src/comun/validacion/cantidades.ts: milésimas con tolerancia de punto flotante
const enMilesimas = (n: number) => Math.round(n * 1000);
const tresDecimales = (n: number) =>
  Math.abs(n * 1000 - enMilesimas(n)) <= 1e-9 * Math.max(1, Math.abs(n * 1000));
const redondear = (n: number) => enMilesimas(n) / 1000;

/** Valor en la unidad base, redondeado a milésimas; `null` si necesita más de tres decimales. */
export function aUnidadBase(valor: number, factor: number): number | null {
  const producto = valor * factor;
  return tresDecimales(producto) ? redondear(producto) : null;
}

/** Tamaño de la presentación: el tamaño declarado, o unidades × la suelta de adentro. */
export function tamanoDePresentacion(p: {
  tamano: number | null;
  unidades: number | null;
  contiene: { tamano: number } | null;
}): number {
  if (p.tamano !== null) return p.tamano;
  if (p.unidades !== null && p.contiene !== null) return redondear(p.unidades * p.contiene.tamano);
  return 0;
}

const cantidadConSimbolo = (valor: number, unidad: UnidadBase) =>
  `${formatearNumero(valor)} ${SIMBOLO_UNIDAD[unidad]}`;

/** Error si una presentación supera su tope para la unidad; `null` si cabe. */
export function errorDeTamano(tamano: number, unidad: UnidadBase): string | null {
  const tope = TOPES.presentacion[unidad];
  if (enMilesimas(tamano) <= tope * 1000) return null;
  return `Una presentación llega hasta ${cantidadConSimbolo(tope, unidad)}`;
}

/** Error si una línea supera el tope de línea, en la unidad base; `null` si cabe. */
export function errorDeLinea(cantidadBase: number, unidad: UnidadBase): string | null {
  const tope = TOPES.linea;
  if (enMilesimas(cantidadBase) <= tope * 1000) return null;
  return `Una línea llega hasta ${cantidadConSimbolo(tope, unidad)}`;
}
