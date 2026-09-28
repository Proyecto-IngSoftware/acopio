import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Rol } from '../../generado/prisma/enums';
import type { UsuarioAutenticado } from './usuario-autenticado';

export const CLAVE_PUBLICO = 'acopio:publico';
export const CLAVE_ROLES = 'acopio:roles';

/** El endpoint no exige sesión. */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

/** Solo estos roles pueden llamar el endpoint. Sin el decorador, cualquier usuario activo. */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);

/** El usuario resuelto por el guard, con su estado y rol leídos de la base. */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<{ usuario: UsuarioAutenticado }>().usuario,
);
