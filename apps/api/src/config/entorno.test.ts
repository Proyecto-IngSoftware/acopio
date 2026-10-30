import { leerEntorno } from './entorno';

const valido = {
  NODE_ENV: 'development',
  APP_URL: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://acopio_app@localhost:5432/acopio',
  AUTH_PROVEEDOR: 'local',
  SUPABASE_JWKS_URL: 'http://localhost:3000/api/auth/.well-known/jwks.json',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  CORREO_REMITENTE: 'Acopio <no-responder@acopio.local>',
  S3_ENDPOINT: 'http://localhost:3900',
  S3_REGION: 'garage',
  S3_BUCKET: 'comprobantes',
  S3_ACCESS_KEY: 'GK0',
  S3_SECRET_KEY: '0',
  CAPTCHA_LLAVE: 'llave-de-prueba-de-al-menos-32-caracteres',
};

describe('leerEntorno', () => {
  it('acepta un entorno de desarrollo completo', () => {
    const e = leerEntorno(valido);
    expect(e.API_PUERTO).toBe(3000);
    expect(e.SMTP_PORT).toBe(1025);
    expect(e.SMTP_SEGURO).toBe(false);
  });

  it('no arranca con el login local en producción (P-025)', () => {
    expect(() => leerEntorno({ ...valido, NODE_ENV: 'production' })).toThrow(
      /AUTH_PROVEEDOR=local no está permitido/,
    );
  });

  it('exige las llaves de Supabase con el adaptador supabase', () => {
    expect(() => leerEntorno({ ...valido, AUTH_PROVEEDOR: 'supabase' })).toThrow(
      /exige SUPABASE_URL/,
    );
  });

  it('el correo viene encendido si no se dice otra cosa', () => {
    expect(leerEntorno(valido).CORREO_ACTIVO).toBe(true);
  });

  it('con el correo apagado no exige SMTP ni remitente (P-055)', () => {
    const { SMTP_HOST: _h, SMTP_PORT: _p, CORREO_REMITENTE: _r, ...sinCorreo } = valido;
    expect(leerEntorno({ ...sinCorreo, CORREO_ACTIVO: 'false' }).CORREO_ACTIVO).toBe(false);
  });

  it('con el correo encendido exige SMTP_HOST y CORREO_REMITENTE', () => {
    const { SMTP_HOST: _h, CORREO_REMITENTE: _r, ...sinCorreo } = valido;
    expect(() => leerEntorno(sinCorreo)).toThrow(/CORREO_ACTIVO=true exige SMTP_HOST/);
  });

  it('el captcha viene encendido y con la dificultad por defecto (ADR-0024)', () => {
    const e = leerEntorno(valido);
    expect(e.CAPTCHA_ACTIVO).toBe(true);
    expect(e.CAPTCHA_DIFICULTAD).toBe(1_500);
  });

  it('con el captcha encendido exige una CAPTCHA_LLAVE de al menos 32 caracteres', () => {
    const { CAPTCHA_LLAVE: _l, ...sinLlave } = valido;
    expect(() => leerEntorno(sinLlave)).toThrow(/CAPTCHA_ACTIVO=true exige CAPTCHA_LLAVE/);
    expect(() => leerEntorno({ ...valido, CAPTCHA_LLAVE: 'corta' })).toThrow();
  });

  it('con el captcha apagado no exige la llave', () => {
    const { CAPTCHA_LLAVE: _l, ...sinLlave } = valido;
    expect(leerEntorno({ ...sinLlave, CAPTCHA_ACTIVO: 'false' }).CAPTCHA_ACTIVO).toBe(false);
    // El Compose pasa las variables sin definir como cadena vacía
    expect(
      leerEntorno({ ...valido, CAPTCHA_ACTIVO: 'false', CAPTCHA_LLAVE: '' }).CAPTCHA_LLAVE,
    ).toBeUndefined();
  });

  it('la importación lee la copia guardada y la lectura programada viene apagada (pieza E)', () => {
    const e = leerEntorno(valido);
    expect(e.IMPORTACION_ORIGEN).toBe('archivo');
    expect(e.IMPORTACION_PROGRAMADA).toBe(false);
  });

  it('la importación acepta leer por red y encender la lectura programada', () => {
    const e = leerEntorno({
      ...valido,
      IMPORTACION_ORIGEN: 'http',
      IMPORTACION_PROGRAMADA: 'true',
    });
    expect(e.IMPORTACION_ORIGEN).toBe('http');
    expect(e.IMPORTACION_PROGRAMADA).toBe(true);
  });

  it('nombra la variable que falta', () => {
    const { DATABASE_URL: _omitida, ...incompleto } = valido;
    expect(() => leerEntorno(incompleto)).toThrow(/DATABASE_URL/);
  });
});
