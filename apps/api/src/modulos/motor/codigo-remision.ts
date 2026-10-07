import { randomBytes } from 'node:crypto';
import { ALFABETO_FOLIO } from '../comprobantes/folio';

/** R-2026-7KQ4M: mismo alfabeto que el folio, sin 0/O ni 1/I. No es secuencial. */
export function generarCodigoRemision(
  anio: number,
  azar: (n: number) => Buffer = randomBytes,
): string {
  const sufijo = [...azar(5)].map((b) => ALFABETO_FOLIO[b % 32]).join('');
  return `R-${anio}-${sufijo}`;
}
