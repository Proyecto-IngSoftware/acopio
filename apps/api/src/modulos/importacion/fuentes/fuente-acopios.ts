import type { LecturaFuente } from './tipos';

/** Puerto de una fuente externa de acopios (RF-RED-011): agregar otra no toca el resto. */
export interface FuenteAcopios {
  /** Lo que se guarda en `acopio.fuente`, por ejemplo `redacopio`. */
  readonly nombre: string;
  readonly origen: 'ARCHIVO' | 'HTTP';
  /** Lo que lee la gente en la atribución: «Fuente: RedAcopio Bogotá» (RF-RED-003). */
  readonly etiqueta: string;
  /** La página de la fuente, para el enlace de la atribución. */
  readonly url: string;
  /** El municipio de sus puntos: la fuente no lo trae por punto. */
  readonly municipio: string;
  leer(): Promise<LecturaFuente>;
}

export const FUENTE_ACOPIOS = Symbol('FUENTE_ACOPIOS');
