import type { CSSProperties } from 'react';

/** Verdadero si el sistema pide menos movimiento, o si no hay cómo saberlo (jsdom en las
 *  pruebas): ahí no se espera ninguna animación antes de seguir. */
export function prefiereMenosMovimiento(): boolean {
  if (typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Retraso de la fila `i` de una lista que entra escalonada: 60 ms por fila hasta la sexta. */
export function retrasoEntrada(i: number): CSSProperties {
  return { animationDelay: `${Math.min(i, 5) * 60}ms` };
}
