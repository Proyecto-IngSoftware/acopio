import sharp from 'sharp';
import { ErrorDominio } from '../../comun/errores/error-dominio';

export const TAMANO_MAXIMO = 8 * 1024 * 1024;
const MAXIMO_PIXELES = 50_000_000;
const ADMITIDOS = new Set(['jpeg', 'png', 'webp', 'heif']);

/**
 * Valida el tipo real por el contenido, no por la extensión, y devuelve un WebP sin
 * metadatos: sharp los descarta salvo que se pidan, así se va el EXIF con la ubicación
 * del teléfono (RF-CMP-002). La rotación del EXIF se aplica antes de perderlo.
 */
export async function procesarImagen(
  datos: Buffer,
): Promise<{ imagen: Buffer; miniatura: Buffer }> {
  if (datos.length > TAMANO_MAXIMO) {
    throw new ErrorDominio('ARCHIVO_GRANDE', 'La foto pesa más de 8 MB', 413);
  }
  let formato: string | undefined;
  let pixeles = 0;
  try {
    const m = await sharp(datos, { limitInputPixels: MAXIMO_PIXELES }).metadata();
    formato = m.format;
    pixeles = (m.width ?? 0) * (m.height ?? 0);
  } catch (e) {
    if (/pixel limit/i.test(String(e))) throw demasiadosPixeles();
    formato = undefined;
  }
  if (!formato || !ADMITIDOS.has(formato)) {
    throw new ErrorDominio('TIPO_NO_ADMITIDO', MENSAJE_TIPO, 415);
  }
  // Un PNG pequeño puede declarar miles de millones de píxeles: se descarta antes de decodificar
  if (pixeles > MAXIMO_PIXELES) {
    throw demasiadosPixeles();
  }
  const base = sharp(datos, { limitInputPixels: MAXIMO_PIXELES }).rotate();
  try {
    return await convertir(base);
  } catch {
    // encabezado válido pero imagen truncada o un HEIC que sharp no sabe decodificar
    throw new ErrorDominio('TIPO_NO_ADMITIDO', MENSAJE_TIPO, 415);
  }
}

const demasiadosPixeles = () =>
  new ErrorDominio('ARCHIVO_GRANDE', 'La foto es demasiado grande en píxeles', 413);

const MENSAJE_TIPO = 'Sube una foto en JPEG, PNG, WebP o HEIC';

async function convertir(base: sharp.Sharp): Promise<{ imagen: Buffer; miniatura: Buffer }> {
  const [imagen, miniatura] = await Promise.all([
    base
      .clone()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
    base
      .clone()
      .resize({ width: 320, height: 320, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer(),
  ]);
  return { imagen, miniatura };
}
