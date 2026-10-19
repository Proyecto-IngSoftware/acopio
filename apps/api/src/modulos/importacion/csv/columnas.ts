import { z } from 'zod';

/** Celdas de CSV: todo llega como texto; vacío cuenta como «no está». */
export const texto = (falta: string) => z.string().trim().min(1, falta);
export const opcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));
export const numero = (falta: string) =>
  z
    .string()
    .trim()
    .min(1, falta)
    .transform((v) => Number(v.replace(',', '.')))
    .pipe(z.number({ error: 'Debe ser un número' }).finite('Debe ser un número'));
export const entero = (falta: string) =>
  numero(falta).pipe(
    z.number().int('Debe ser un número entero').nonnegative('No puede ser negativo'),
  );
// Los mismos rangos de los formularios: la base rechaza lo que cae fuera de Colombia
export const latitud = numero('Falta la latitud').pipe(
  z
    .number()
    .min(-5, 'La latitud va de -5 a 14 (Colombia)')
    .max(14, 'La latitud va de -5 a 14 (Colombia)'),
);
export const longitud = numero('Falta la longitud').pipe(
  z
    .number()
    .min(-82, 'La longitud va de -82 a -66 (Colombia)')
    .max(-66, 'La longitud va de -82 a -66 (Colombia)'),
);
export const fecha = (falta: string) => z.iso.date(`${falta} (AAAA-MM-DD)`);

/** Errores de `revisar` para las filas cuyo nombre no aparece en la base. */
export function faltantes<F>(
  filas: { numero: number; datos: F }[],
  columna: string,
  nombre: (f: F) => string,
  existe: (n: string) => boolean,
  mensaje: (n: string) => string,
) {
  return filas
    .filter((f) => !existe(nombre(f.datos)))
    .map((f) => ({ numero: f.numero, columna, mensaje: mensaje(nombre(f.datos)) }));
}
