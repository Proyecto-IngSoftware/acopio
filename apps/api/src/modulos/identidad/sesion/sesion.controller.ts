import { Body, Controller, Get, HttpCode, Inject, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ErrorDto, SesionDto, YoDto } from '../../../comun/respuestas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Publico, UsuarioActual } from '../../../comun/autorizacion/decoradores';
import { COOKIE_SESION, opcionesCookie } from '../../../comun/cookie-sesion';
import { ENTORNO, type Entorno } from '../../../config/entorno';
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
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  /** Inicia sesión con nombre de usuario y contraseña (RF-IDE-004). Límite por IP. Deja la
   *  sesión en la cookie acopio_sesion. */
  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('sesion')
  @HttpCode(200)
  @ApiOkResponse({ type: SesionDto })
  @ApiResponse({
    status: 'default',
    type: ErrorDto,
    description: 'Error con forma { estado, codigo, mensaje, detalles? }',
  })
  async iniciar(@Body() datos: IniciarSesionDto, @Res({ passthrough: true }) res: Response) {
    // El token va en la cookie HttpOnly y no en el cuerpo (ADR-0014)
    const { accessToken, ...sesion } = await this.sesion.iniciar(datos.usuario, datos.contrasena);
    res.cookie(COOKIE_SESION, accessToken, opcionesCookie(this.entorno, new Date(sesion.expiraEn)));
    return sesion;
  }

  /** Borra la cookie de sesión. Público: sirve aunque el token ya haya vencido. */
  @Publico()
  @Post('salir')
  @HttpCode(204)
  salir(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_SESION, opcionesCookie(this.entorno));
  }

  /** El usuario de la sesión y sus ubicaciones. */
  @ApiBearerAuth()
  @Get('yo')
  @ApiOkResponse({ type: YoDto })
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
