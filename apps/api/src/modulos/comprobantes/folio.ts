import { randomBytes } from 'node:crypto';

/** 32 caracteres sin 0/O ni 1/I: 32⁵ ≈ 33 millones de folios por año. */
export const ALFABETO_FOLIO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** ACO-2026-7KQ4M. No es secuencial: no se adivina otro probando números. */
export function generarFolio(anio: number, azar: (n: number) => Buffer = randomBytes): string {
  // 256 es múltiplo de 32: el resto reparte parejo entre los 32 caracteres
  const sufijo = [...azar(5)].map((b) => ALFABETO_FOLIO[b % 32]).join('');
  return `ACO-${anio}-${sufijo}`;
}

/** Mayúsculas y sin espacios; null si no tiene la forma de un folio. */
export function normalizarFolio(texto: string): string | null {
  const folio = texto.trim().toUpperCase();
  return /^ACO-\d{4}-[A-HJ-NP-Z2-9]{5}$/.test(folio) ? folio : null;
}
