import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ENTORNO, type Entorno } from '../config/entorno';
import { COOKIE_SESION, leerCookie } from './cookie-sesion';
import { ErrorDominio } from './errores/error-dominio';

const ESCRITURAS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * ADR-0014: una escritura que llega con la cookie de sesión solo se acepta desde el
 * origen de la web. Es la segunda barrera contra peticiones falsificadas; la primera es
 * SameSite=Strict. Con Bearer no aplica: ese token no lo manda el navegador solo.
 */
@Injectable()
export class OrigenGuard implements CanActivate {
  private readonly permitido: string;

  constructor(@Inject(ENTORNO) entorno: Entorno) {
    this.permitido = new URL(entorno.APP_URL).origin;
  }

  canActivate(ctx: ExecutionContext): boolean {
    const r = ctx.switchToHttp().getRequest<Request>();
    if (!ESCRITURAS.has(r.method)) return true;
    if (!leerCookie(r.headers.cookie, COOKIE_SESION)) return true;
    const origen = r.headers.origin;
    if (!origen || origen === this.permitido) return true;
    throw new ErrorDominio(
      'ORIGEN_NO_PERMITIDO',
      'La petición viene de un sitio no permitido',
      403,
    );
  }
}
