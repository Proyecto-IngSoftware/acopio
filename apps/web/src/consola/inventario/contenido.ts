type Unidad = 'LITRO' | 'KILOGRAMO' | 'UNIDAD';

/** Lo que trae cada presentación de un código, como se escribe en el campo. Vacío: sin contenido. */
export function leerContenido(texto: string, unidad: Unidad | undefined) {
  if (texto.trim() === '') return { valor: null, error: null };
  const n = Number(texto.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0)
    return { valor: null, error: 'El contenido tiene que ser mayor que cero.' };
  if (unidad === 'UNIDAD' && !Number.isInteger(n))
    return { valor: null, error: 'En unidades, el contenido va sin decimales.' };
  return { valor: n, error: null };
}
