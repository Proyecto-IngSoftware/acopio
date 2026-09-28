import { Body, Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Publico, UsuarioActual } from '../../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../../comun/autorizacion/usuario-autenticado';
import { PROVEEDOR_IDENTIDAD, type ProveedorIdentidad } from '../proveedor/proveedor-identidad';
import { SesionService } from './sesion.service';

class IniciarSesionDto extends createZodDto(
  z.object({
    usuario: z.string().trim().min(1).max(64).describe('Nombre de usuario, no correo'),
    contrasena: z.string().min(1).max(256),
  }),
) {}

@ApiTags('sesión')
@Controller('auth')
export class SesionController {
  constructor(
    private readonly sesion: SesionService,
    @Inject(PROVEEDOR_IDENTIDAD) private readonly proveedor: ProveedorIdentidad,
  ) {}

  /** Inicia sesión con nombre de usuario y contraseña (RF-IDE-004). Límite por IP. */
  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('sesion')
  @HttpCode(200)
  iniciar(@Body() datos: IniciarSesionDto) {
    return this.sesion.iniciar(datos.usuario, datos.contrasena);
  }

  /** El usuario de la sesión y sus ubicaciones. */
  @ApiBearerAuth()
  @Get('yo')
  yo(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.sesion.yo(usuario.id);
  }

  /** Llaves públicas con las que se verifican los tokens. */
  @Publico()
  @Get('.well-known/jwks.json')
  jwks() {
    return this.proveedor.jwks();
  }
}
