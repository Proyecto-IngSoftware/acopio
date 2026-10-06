import { Body, Controller, Get, HttpCode, Inject, Param, Post, Res } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Publico } from '../../../comun/autorizacion/decoradores';
import { COOKIE_SESION, opcionesCookie } from '../../../comun/cookie-sesion';
import { ErrorDto, MensajeDto, SesionDto } from '../../../comun/respuestas';
import { ENTORNO, type Entorno } from '../../../config/entorno';
import { LONGITUD_MINIMA } from '../invitaciones/politica-contrasena';
import { DonadorService } from './donador.service';

class RegistroDto extends createZodDto(
  z
    .object({
      correo: z.email().max(254),
      nombre: z.string().trim().min(2).max(120),
    })
    .strict(),
) {}
class ConfirmarDto extends createZodDto(
  z.object({
    token: z.string().min(1).max(200),
    contrasena: z.string().min(LONGITUD_MINIMA).max(256),
    nombre: z.string().trim().min(2).max(120).optional(),
  }),
) {}
class EnlaceDonadorDto extends createZodDto(z.object({ nombre: z.string(), correo: z.string() })) {}
class SesionDonadorDto extends createZodDto(
  z.object({ correo: z.string().trim().min(3).max(254), contrasena: z.string().min(1).max(256) }),
) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

@ApiTags('donador')
@Controller('auth')
export class DonadorController {
  constructor(
    private readonly donador: DonadorService,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  /** Crea la cuenta de un Donador y envía el enlace de confirmación (RF-IDE-013). */
  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('registro')
  @HttpCode(202)
  @ApiResponse({ status: 202, type: MensajeDto })
  @ApiResponse(errores)
  async registrar(@Body() datos: RegistroDto) {
    await this.donador.registrar(datos);
    return { mensaje: 'Te enviamos un correo para confirmar tu cuenta' };
  }

  /** Antes de pedir la contraseña: dice si el enlace sirve y para quién es. */
  @Publico()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('registro/confirmar/:token')
  @ApiOkResponse({ type: EnlaceDonadorDto })
  @ApiResponse(errores)
  validarEnlace(@Param('token') token: string) {
    return this.donador.validarEnlace(token);
  }

  /** Confirma el correo, fija la contraseña elegida e inicia la sesión (P-040). */
  @Publico()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('registro/confirmar')
  @HttpCode(200)
  @ApiOkResponse({ type: SesionDto })
  @ApiResponse(errores)
  async confirmar(@Body() datos: ConfirmarDto, @Res({ passthrough: true }) res: Response) {
    return this.abrirSesion(
      res,
      await this.donador.confirmar(datos.token, datos.contrasena, datos.nombre),
    );
  }

  /** Inicio de sesión del Donador, con correo (RF-IDE-013). Deja la cookie de siempre. */
  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('donador/sesion')
  @HttpCode(200)
  @ApiOkResponse({ type: SesionDto })
  @ApiResponse(errores)
  async iniciar(@Body() datos: SesionDonadorDto, @Res({ passthrough: true }) res: Response) {
    return this.abrirSesion(res, await this.donador.iniciarSesion(datos.correo, datos.contrasena));
  }

  private abrirSesion(
    res: Response,
    { accessToken, ...sesion }: Awaited<ReturnType<DonadorService['iniciarSesion']>>,
  ) {
    res.cookie(COOKIE_SESION, accessToken, opcionesCookie(this.entorno, new Date(sesion.expiraEn)));
    return sesion;
  }
}
