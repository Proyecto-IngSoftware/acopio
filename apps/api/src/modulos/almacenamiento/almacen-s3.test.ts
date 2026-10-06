import type { Entorno } from '../../config/entorno';
import { AlmacenS3 } from './almacen-s3';

const entorno = (extra: Partial<Entorno> = {}) =>
  ({
    S3_ENDPOINT: 'http://storage:3900',
    S3_REGION: 'garage',
    S3_BUCKET: 'comprobantes',
    S3_ACCESS_KEY: 'GK0',
    S3_SECRET_KEY: '0',
    ...extra,
  }) as Entorno;

describe('AlmacenS3 (P-041)', () => {
  it('firma con S3_URL_PUBLICA cuando existe', async () => {
    const almacen = new AlmacenS3(entorno({ S3_URL_PUBLICA: 'http://localhost:3900' }));
    const url = await almacen.urlFirmada('facturas/x.webp', 300);
    expect(url.startsWith('http://localhost:3900/comprobantes/facturas/x.webp?')).toBe(true);
    expect(url).toContain('X-Amz-Signature=');
  });

  it('sin S3_URL_PUBLICA firma con S3_ENDPOINT', async () => {
    const url = await new AlmacenS3(entorno()).urlFirmada('facturas/x.webp', 300);
    expect(url.startsWith('http://storage:3900/comprobantes/')).toBe(true);
  });
});
