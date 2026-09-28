import { SIMBOLO_UNIDAD, type UnidadBase } from './unidades.js';

const LOCALE = 'es-CO';

const numero = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

/** Número en español de Colombia: punto de miles y coma decimal (RNF-12). */
export function formatearNumero(valor: number): string {
  return numero.format(valor);
}

/** Cantidad con su unidad base, por ejemplo «1.240,5 L». */
export function formatearCantidad(valor: number, unidad: UnidadBase): string {
  return `${formatearNumero(valor)} ${SIMBOLO_UNIDAD[unidad]}`;
}
