import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Rol } from '../../../generado/prisma/enums';
import { CLAVE_DONADOR, CLAVE_PUBLICO, CLAVE_ROLES } from '../../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../../comun/autorizacion/usuario-autenticado';
import { COOKIE_SESION, leerCookie } from '../../../comun/cookie-sesion';
import { VerificadorToken } from './verificador-token';

/**
 * Guard global (RF-IDE-005). En cada request:
 * 1. Valida el token contra el JWKS del proveedor
 * 2. Busca el `sub` en usuario.supabase_uid
 * 3. Sin fila o con estado distinto de ACTIVO: 403
 * 4. Revisa el rol pedido por el endpoint
 *
 * Nada del rol ni del alcance viaja en el token: se lee de la base cada vez, así una
 * suspensión surte efecto en el siguiente request.
 */
@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verificador: VerificadorToken,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, objetivos)) return true;

    const request = ctx.switchToHttp().getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const token = extraerToken(request);
    if (!token) throw new UnauthorizedException('Falta la sesión');

    const verificado = await this.verificador.verificar(token);
    if (!verificado) throw new UnauthorizedException('La sesión no es válida o venció');

    const usuario = await this.prisma.usuario.findUnique({
      where: { supabase_uid: verificado.sub },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        estado: true,
        tokens_validos_desde: true,
      },
    });
    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new ForbiddenException('Tu acceso no está activo');
    }
    // El token se emitió antes de un restablecimiento de acceso (RF-IDE-009)
    if (
      usuario.tokens_validos_desde &&
      verificado.emitidoEn.getTime() < usuario.tokens_validos_desde.getTime() - 1000
    ) {
      throw new UnauthorizedException('La sesión ya no es válida; vuelve a iniciar sesión');
    }

    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(CLAVE_ROLES, objetivos);
    // La consola no es del Donador: solo entra donde el endpoint lo nombra (Bloque 3).
    // Va antes de la revisión de roles para que responda siempre el mismo mensaje.
    if (
      usuario.rol === 'DONADOR' &&
      !roles?.includes('DONADOR') &&
      !this.reflector.getAllAndOverride<boolean>(CLAVE_DONADOR, objetivos)
    ) {
      throw new ForbiddenException('Esta sección es de la consola');
    }
    if (roles && !roles.includes(usuario.rol)) {
      throw new ForbiddenException('Tu rol no permite esta acción');
    }

    request.usuario = {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };
    return true;
  }
}

/** Primero la cookie de la web (ADR-0014); si no hay, Bearer para pruebas y herramientas. */
function extraerToken(request: Request): string | null {
  const deCookie = leerCookie(request.headers.cookie, COOKIE_SESION);
  if (deCookie) return deCookie;
  const [tipo, valor] = request.headers.authorization?.split(' ') ?? [];
  return tipo === 'Bearer' && valor ? valor : null;
}
