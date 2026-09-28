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

  it('nombra la variable que falta', () => {
    const { DATABASE_URL: _omitida, ...incompleto } = valido;
    expect(() => leerEntorno(incompleto)).toThrow(/DATABASE_URL/);
  });
});
