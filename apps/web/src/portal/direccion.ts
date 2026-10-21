import { seccionDe } from './secciones';

export type Direccion = 'adelante' | 'atras' | 'ninguna';

const segmentos = (ruta: string) => ruta.split('/').filter(Boolean).length;

/** Hacia dónde entra la página nueva. Volver con el navegador, ir a una pestaña que está a la
 *  izquierda en la barra o subir de un detalle a su lista entra desde la izquierda; lo demás,
 *  desde la derecha. */
export function direccionEntre(
  anterior: string | null,
  actual: string,
  tipo: 'POP' | 'PUSH' | 'REPLACE',
): Direccion {
  if (anterior === null || anterior === actual) return 'ninguna';
  if (tipo === 'POP') return 'atras';
  const de = seccionDe(anterior);
  const a = seccionDe(actual);
  if (de >= 0 && a >= 0 && de !== a) return a > de ? 'adelante' : 'atras';
  return segmentos(actual) < segmentos(anterior) ? 'atras' : 'adelante';
}
