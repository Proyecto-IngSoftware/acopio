import type { LecturaFuente } from './tipos';

/** Puerto de una fuente externa de acopios (RF-RED-011): agregar otra no toca el resto. */
export interface FuenteAcopios {
  /** Lo que se guarda en `acopio.fuente`, por ejemplo `redacopio`. */
  readonly nombre: string;
  readonly origen: 'ARCHIVO' | 'HTTP';
  leer(): Promise<LecturaFuente>;
}

export const FUENTE_ACOPIOS = Symbol('FUENTE_ACOPIOS');
