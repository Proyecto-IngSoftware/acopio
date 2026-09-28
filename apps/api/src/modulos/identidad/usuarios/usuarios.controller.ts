import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../../comun/autorizacion/usuario-autenticado';
import { UsuariosService } from './usuarios.service';

const rolInterno = z.enum(['ADMIN', 'OPERADOR', 'AUDITOR', 'RECEPTOR']);
const asignacion = z.object({ tipo: z.enum(['ACOPIO', 'ZONA']), ubicacionId: z.uuid() });

class CrearUsuarioDto extends createZodDto(
  z.object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras sin tildes, números, punto, guion y guion bajo'),
    nombre: z.string().trim().min(1).max(120),
    rol: rolInterno,
    correo: z.email().nullish().describe('Sin correo no hay recuperación de contraseña'),
    asignaciones: z.array(asignacion).default([]),
  }),
) {}

class ActualizarUsuarioDto extends createZodDto(
  z.object({
    nombre: z.string().trim().min(1).max(120).optional(),
    rol: rolInterno.optional(),
    correo: z.email().nullish(),
  }),
) {}

class FiltroUsuariosDto extends createZodDto(
  z.object({
    rol: z.enum(['ADMIN', 'OPERADOR', 'AUDITOR', 'RECEPTOR', 'DONADOR']).optional(),
    estado: z.enum(['INVITADO', 'ACTIVO', 'SUSPENDIDO']).optional(),
    q: z.string().trim().min(1).optional(),
  }),
) {}

class AsignacionDto extends createZodDto(asignacion) {}

class DesasignarDto extends createZodDto(z.object({ confirmar: z.stringbool().default(false) })) {}

class RestablecerDto extends createZodDto(
  z.object({
    motivo: z.string().trim().min(20, 'El motivo necesita al menos 20 caracteres').max(500),
  }),
) {}

/** Usuarios y accesos (C16). Solo el Administrador escribe; el Auditor consulta. */
@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /** Crea un usuario INVITADO y devuelve el enlace de invitación (RF-IDE-001, 002). */
  @Roles('ADMIN')
  @Post()
  crear(@UsuarioActual() admin: UsuarioAutenticado, @Body() datos: CrearUsuarioDto) {
    return this.usuarios.crear(admin, datos);
  }

  @Roles('ADMIN', 'AUDITOR')
  @Get()
  listar(@Query() filtro: FiltroUsuariosDto) {
    return this.usuarios.listar(filtro);
  }

  @Roles('ADMIN', 'AUDITOR')
  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.obtener(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  actualizar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cambios: ActualizarUsuarioDto,
  ) {
    return this.usuarios.actualizar(admin, id, cambios);
  }

  @Roles('ADMIN')
  @Post(':id/suspender')
  suspender(@UsuarioActual() admin: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.suspender(admin, id);
  }

  @Roles('ADMIN')
  @Post(':id/reactivar')
  reactivar(@UsuarioActual() admin: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.reactivar(admin, id);
  }

  /** Nueva invitación para quien no ha canjeado la suya; revoca la anterior. */
  @Roles('ADMIN')
  @Post(':id/invitacion')
  reinvitar(@UsuarioActual() admin: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarios.reinvitar(admin, id);
  }

  @Roles('ADMIN')
  @Delete(':id/invitacion')
  revocarInvitacion(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usuarios.revocarInvitacion(admin, id);
  }

  /** Restablecer acceso de un usuario activo, con motivo (RF-IDE-009). */
  @Roles('ADMIN')
  @Post(':id/restablecer')
  restablecer(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: RestablecerDto,
  ) {
    return this.usuarios.restablecer(admin, id, datos.motivo);
  }

  @Roles('ADMIN')
  @Post(':id/asignaciones')
  asignar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: AsignacionDto,
  ) {
    return this.usuarios.asignar(admin, id, datos);
  }

  /** Si la ubicación queda sin responsable, responde 409 hasta que se confirme. */
  @Roles('ADMIN')
  @Delete(':id/asignaciones/:tipo/:ubicacionId')
  desasignar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tipo') tipo: string,
    @Param('ubicacionId', ParseUUIDPipe) ubicacionId: string,
    @Query() opciones: DesasignarDto,
  ) {
    const asignacionValida = asignacion.parse({ tipo, ubicacionId });
    return this.usuarios.desasignar(admin, id, asignacionValida, opciones.confirmar);
  }
}
