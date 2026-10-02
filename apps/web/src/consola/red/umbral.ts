type Unidad = 'LITRO' | 'KILOGRAMO' | 'UNIDAD';

/** Las reglas del umbral antes de enviarlo: las mismas del `CHECK` de `umbral` y de la API. Null si está bien. */
export function errorUmbral(minimo: number, maximo: number, unidad: Unidad): string | null {
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo) || minimo < 0 || maximo < 0)
    return 'Escribe el mínimo y el máximo, desde cero.';
  if (unidad === 'UNIDAD' && (!Number.isInteger(minimo) || !Number.isInteger(maximo)))
    return 'En unidades, el mínimo y el máximo van sin decimales.';
  if (minimo > maximo) return 'El mínimo no puede ser mayor que el máximo.';
  return null;
}
