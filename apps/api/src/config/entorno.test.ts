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

  it('nombra la variable que falta', () => {
    const { DATABASE_URL: _omitida, ...incompleto } = valido;
    expect(() => leerEntorno(incompleto)).toThrow(/DATABASE_URL/);
  });
});
