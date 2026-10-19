import { parse } from 'csv-parse/sync';
import { ErrorDominio } from '../../../comun/errores/error-dominio';

export const MAXIMO_BYTES = 2 * 1024 * 1024;
export const MAXIMO_FILAS = 5_000;

/**
 * Lee un CSV en UTF-8 como filas `columna → texto` (pieza E). Detecta en la cabecera si el
 * separador es coma o punto y coma (Excel en español guarda con punto y coma), quita el BOM y
 * recorta espacios. Un archivo grande se rechaza antes de leerlo entero.
 */
export function leerCsv(contenido: Buffer): Record<string, string>[] {
  if (contenido.length > MAXIMO_BYTES) {
    throw new ErrorDominio('CSV_DEMASIADO_GRANDE', 'El archivo pasa de 2 MB', 413);
  }
  const texto = contenido.toString('utf8').replace(/^\uFEFF/, '');
  const cabecera = texto.split(/\r?\n/, 1)[0] ?? '';
  if (!cabecera.trim()) throw new ErrorDominio('CSV_INVALIDO', 'El archivo no tiene cabecera', 422);
  const delimitador =
    (cabecera.match(/;/g)?.length ?? 0) > (cabecera.match(/,/g)?.length ?? 0) ? ';' : ',';
  let filas: Record<string, string>[];
  try {
    filas = parse(texto, {
      columns: (c: string[]) => c.map((x) => x.trim()),
      delimiter: delimitador,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch (e) {
    throw new ErrorDominio(
      'CSV_INVALIDO',
      `El archivo no se pudo leer: ${(e as Error).message}`,
      422,
    );
  }
  if (filas.length > MAXIMO_FILAS) {
    throw new ErrorDominio('CSV_DEMASIADO_GRANDE', `El archivo pasa de ${MAXIMO_FILAS} filas`, 413);
  }
  return filas;
}
