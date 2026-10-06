import sharp from 'sharp';
import { ErrorDominio } from '../../comun/errores/error-dominio';

export const TAMANO_MAXIMO = 8 * 1024 * 1024;
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
  try {
    formato = (await sharp(datos).metadata()).format;
  } catch {
    formato = undefined;
  }
  if (!formato || !ADMITIDOS.has(formato)) {
    throw new ErrorDominio('TIPO_NO_ADMITIDO', 'Sube una foto en JPEG, PNG, WebP o HEIC', 415);
  }
  const base = sharp(datos).rotate();
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
