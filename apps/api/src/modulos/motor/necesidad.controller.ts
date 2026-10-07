import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDto, ExcedenteDto, FichaZonaDto, NecesidadManualDto } from '../../comun/respuestas';
import { cantidadNoNegativa } from '../../comun/validacion/cantidades';
import { NecesidadService } from './necesidad.service';

class ManualDto extends createZodDto(
  z.object({
    cantidad: cantidadNoNegativa.nullable(),
    motivo: z.string().trim().min(10).max(280),
  }),
) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** C10 Ficha de zona y excedentes de un acopio (RF-MOT-002 a 004). */
@ApiTags('motor')
@ApiBearerAuth()
@Controller()
export class NecesidadController {
  constructor(private readonly necesidad: NecesidadService) {}

  @Roles('ADMIN', 'RECEPTOR')
  @Get('zonas/:id/necesidad')
  @ApiOkResponse({ type: FichaZonaDto })
  @ApiResponse(errores)
  ficha(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.necesidad.ficha(u, id);
  }

  @Roles('ADMIN')
  @Put('zonas/:id/necesidad-manual/:categoriaId')
  @ApiOkResponse({ type: NecesidadManualDto })
  @ApiResponse(errores)
  ponerManual(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('categoriaId', ParseUUIDPipe) categoriaId: string,
    @Body() datos: ManualDto,
  ) {
    return this.necesidad.ponerManual(admin, id, categoriaId, datos);
  }

  @Roles('ADMIN', 'OPERADOR')
  @Get('acopios/:id/excedentes')
  @ApiOkResponse({ type: ExcedenteDto, isArray: true })
  @ApiResponse(errores)
  excedentes(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.necesidad.excedentes(u, id);
  }
}
