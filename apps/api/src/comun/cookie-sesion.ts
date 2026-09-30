import type { CookieOptions } from 'express';
import type { Entorno } from '../config/entorno';

/** Cookie de sesión (ADR-0014). La web nunca lee su valor. */
export const COOKIE_SESION = 'acopio_sesion';

/** Lee una cookie de la cabecera `Cookie` sin depender de cookie-parser. */
export function leerCookie(cabecera: string | undefined, nombre: string): string | null {
  for (const parte of cabecera?.split(';') ?? []) {
    const [clave, ...valor] = parte.trim().split('=');
    if (clave === nombre && valor.length > 0) return decodeURIComponent(valor.join('='));
  }
  return null;
}

/** HttpOnly, SameSite=Strict, solo para /api y hasta que vence el token. */
export function opcionesCookie(entorno: Entorno, expiraEn?: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    path: '/api',
    secure: entorno.NODE_ENV === 'production',
    ...(expiraEn ? { maxAge: Math.max(expiraEn.getTime() - Date.now(), 0) } : {}),
  };
}
