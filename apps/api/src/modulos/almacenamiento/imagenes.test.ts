import sharp from 'sharp';
import { procesarImagen } from './imagenes';

const foto = (formato: 'jpeg' | 'png', ancho = 3000, alto = 2000) =>
  sharp({ create: { width: ancho, height: alto, channels: 3, background: '#7a9' } })
    [formato]()
    .withExif({
      IFD0: { Artist: 'Ana Donadora', Copyright: 'cédula 123' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '4/1 36/1 0/1' },
    })
    .toBuffer();

describe('procesarImagen (RF-CMP-002)', () => {
  it('guarda un WebP de 2000 px como máximo, sin metadatos', async () => {
    const { imagen, miniatura } = await procesarImagen(await foto('jpeg'));
    const m = await sharp(imagen).metadata();
    expect((await sharp(miniatura).metadata()).exif).toBeUndefined();
    expect(m.format).toBe('webp');
    expect(Math.max(m.width!, m.height!)).toBe(2000);
    expect(m.exif).toBeUndefined();
  });

  it('hace una miniatura de 320 px', async () => {
    const { miniatura } = await procesarImagen(await foto('png'));
    const m = await sharp(miniatura).metadata();
    expect(Math.max(m.width!, m.height!)).toBe(320);
  });

  it('no agranda una imagen chica', async () => {
    const { imagen } = await procesarImagen(await foto('jpeg', 800, 600));
    expect((await sharp(imagen).metadata()).width).toBe(800);
  });

  it('rechaza lo que no es imagen aunque se llame .jpg', async () => {
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n');
    await expect(procesarImagen(pdf)).rejects.toMatchObject({ codigo: 'TIPO_NO_ADMITIDO' });
  });

  it('rechaza más de 8 MB', async () => {
    await expect(procesarImagen(Buffer.alloc(8 * 1024 * 1024 + 1))).rejects.toMatchObject({
      codigo: 'ARCHIVO_GRANDE',
    });
  });

  it('rechaza con 415 una imagen con encabezado válido pero truncada', async () => {
    const completa = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: '#7a9' },
    })
      .jpeg()
      .toBuffer();
    const truncada = completa.subarray(0, Math.floor(completa.length * 0.6));
    await expect(procesarImagen(truncada)).rejects.toMatchObject({
      codigo: 'TIPO_NO_ADMITIDO',
      estado: 415,
    });
  });

  it('una imagen de 8000 x 8000 px no revienta: 413 o 415, nunca 500', async () => {
    const enorme = await sharp({
      create: { width: 8000, height: 8000, channels: 3, background: '#fff' },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await expect(procesarImagen(enorme)).rejects.toMatchObject({
      codigo: 'ARCHIVO_GRANDE',
      estado: 413,
    });
  });
});
