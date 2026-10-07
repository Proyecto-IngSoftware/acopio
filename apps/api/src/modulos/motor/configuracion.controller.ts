import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ConfiguracionMotorDto, ErrorDto, VistaPreviaMotorDto } from '../../comun/respuestas';
import { cantidadNoNegativa } from '../../comun/validacion/cantidades';
import { ConfiguracionService } from './configuracion.service';

const peso = z.number().min(0).max(1);
class GuardarConfiguracionDto extends createZodDto(
  z.object({
    pesos: z.object({ criticidad: peso, urgencia: peso, proximidad: peso, magnitud: peso }),
    cantidadMinima: cantidadNoNegativa,
  }),
) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** RF-CAT-006. Solo el Administrador. */
@ApiTags('motor')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('motor/configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracion: ConfiguracionService) {}

  @Get()
  @ApiOkResponse({ type: ConfiguracionMotorDto })
  leer() {
    return this.configuracion.leer();
  }

  @Put()
  @ApiOkResponse({ type: ConfiguracionMotorDto })
  @ApiResponse(errores)
  guardar(@UsuarioActual() admin: UsuarioAutenticado, @Body() d: GuardarConfiguracionDto) {
    return this.configuracion.guardar(admin, d);
  }

  @Post('vista-previa')
  @HttpCode(200)
  @ApiOkResponse({ type: VistaPreviaMotorDto })
  @ApiResponse(errores)
  vistaPrevia(@Body() d: GuardarConfiguracionDto) {
    return this.configuracion.vistaPrevia(d);
  }
}
