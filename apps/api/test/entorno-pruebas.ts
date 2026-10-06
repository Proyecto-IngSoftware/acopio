import os from 'node:os';
import path from 'node:path';

/**
 * Base de pruebas. PRUEBAS_PG_URL apunta al servidor con un usuario que pueda crear
 * bases y roles (el dueño en Docker, o el servicio de PostgreSQL en CI).
 */
const servidor = process.env.PRUEBAS_PG_URL ?? 'postgresql://acopio_owner:acopio@localhost:5432';
export const BASE_PRUEBAS = 'acopio_test';
export const CLAVE_APP_PRUEBAS = 'acopio-app-pruebas';

function conBase(url: string, base: string, usuario?: string, clave?: string): string {
  const u = new URL(url);
  u.pathname = `/${base}`;
  if (usuario) u.username = usuario;
  if (clave !== undefined) u.password = clave;
  return u.toString();
}

export const URL_ADMIN_SERVIDOR = conBase(servidor, 'postgres');
export const URL_DUENO_PRUEBAS = conBase(servidor, BASE_PRUEBAS);
export const URL_APP_PRUEBAS = conBase(servidor, BASE_PRUEBAS, 'acopio_app', CLAVE_APP_PRUEBAS);

/** Variables de entorno de la API durante las pruebas. */
export function entornoPruebas(): Record<string, string> {
  return {
    NODE_ENV: 'test',
    APP_URL: 'http://localhost:5173',
    DATABASE_URL: URL_APP_PRUEBAS,
    DATABASE_URL_OWNER: URL_DUENO_PRUEBAS,
    AUTH_PROVEEDOR: 'local',
    SUPABASE_JWKS_URL: 'http://localhost:3000/api/auth/.well-known/jwks.json',
    AUTH_LLAVES_DIR: path.join(os.tmpdir(), 'acopio-pruebas-llaves'),
    // Puerto cerrado: los correos quedan en la cola; las pruebas de envío cambian el transporte
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '9',
    CORREO_REMITENTE: 'Acopio <no-responder@acopio.local>',
    S3_ENDPOINT: 'http://localhost:3900',
    S3_REGION: 'garage',
    S3_BUCKET: 'pruebas',
    S3_ACCESS_KEY: 'GK0',
    S3_SECRET_KEY: '0',
  };
}
