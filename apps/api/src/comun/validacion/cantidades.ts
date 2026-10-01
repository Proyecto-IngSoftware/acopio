import { z } from 'zod';

// La base guarda numeric(12,3): se trabaja en milésimas
const enMilesimas = (n: number) => Math.round(n * 1000);
/** Admite el ruido de punto flotante (1.0000000001), no un cuarto decimal (0.0001). */
const tresDecimales = (n: number) =>
  Math.abs(n * 1000 - enMilesimas(n)) <= 1e-9 * Math.max(1, Math.abs(n * 1000));
const redondear = (n: number) => enMilesimas(n) / 1000;

/** Mayor que cero, hasta 3 decimales y menos de mil millones. Sale redondeada a milésimas. */
export const cantidadPositiva = z
  .number()
  .lt(1_000_000_000)
  .refine(tresDecimales, 'Máximo 3 decimales')
  .transform(redondear)
  .refine((n) => n > 0, 'Debe ser mayor que cero');

/** Como `cantidadPositiva`, pero admite cero (conteo físico, umbrales). */
export const cantidadNoNegativa = z
  .number()
  .min(0)
  .lt(1_000_000_000)
  .refine(tresDecimales, 'Máximo 3 decimales')
  .transform(redondear);
