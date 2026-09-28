import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Publico } from '../../../comun/autorizacion/decoradores';
import { InvitacionesService } from './invitaciones.service';

class CanjearDto extends createZodDto(z.object({ contrasena: z.string().min(1).max(256) })) {}

/** Enlace de invitación y de restablecimiento. Público y con límite por IP (RNF-08). */
@ApiTags('invitaciones')
@Publico()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('invitaciones')
export class InvitacionesController {
  constructor(private readonly invitaciones: InvitacionesService) {}

  /** Lo que ve la persona al abrir el enlace: usuario, nombre y ubicaciones. */
  @Get(':token')
  consultar(@Param('token') token: string) {
    return this.invitaciones.consultar(token);
  }

  /** Define la contraseña y activa la cuenta (RF-IDE-003) o la restablece (RF-IDE-009). */
  @Post(':token/canje')
  @HttpCode(200)
  canjear(@Param('token') token: string, @Body() datos: CanjearDto) {
    return this.invitaciones.canjear(token, datos.contrasena);
  }
}
