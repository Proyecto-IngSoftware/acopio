import { aUnidadBase, errorDeLinea, UNIDADES_DE_ENTRADA, type UnidadBase } from '@acopio/shared';

/** Símbolo de la unidad de entrada con ese factor («g» para 0,001 en kilos). */
export const simboloDe = (unidad: UnidadBase, factor: number) =>
  UNIDADES_DE_ENTRADA[unidad].find((o) => o.factor === factor)?.simbolo ??
  UNIDADES_DE_ENTRADA[unidad][0]!.simbolo;

/** Lo escrito en la unidad elegida, convertido a la unidad base. Con `error` no se debe enviar.
 *  Vacío o cero no es error: es «sin cantidad todavía» (`base` 0). */
export function leerCantidad(
  texto: string,
  factor: number,
  unidad: UnidadBase,
): { base: number; error: string | null } {
  const n = Number(texto.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return { base: 0, error: null };
  const base = aUnidadBase(n, factor);
  if (base === null) {
    return {
      base: 0,
      error:
        factor < 1
          ? `En ${simboloDe(unidad, factor)}, la cantidad va sin decimales`
          : 'Hasta 3 decimales',
    };
  }
  const error = errorDeLinea(base, unidad);
  return error ? { base: 0, error } : { base, error: null };
}
