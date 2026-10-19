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
