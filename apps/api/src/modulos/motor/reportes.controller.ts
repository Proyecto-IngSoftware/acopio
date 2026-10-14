import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Publico, Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDto, ReporteNecesidadDto, ZonaPublicaDto } from '../../comun/respuestas';
import { ReportesService } from './reportes.service';

class ReportarDto extends createZodDto(
  z.object({
    categorias: z.array(z.uuid()).min(1).max(20),
    nota: z
      .string()
      .trim()
      .max(280)
      .optional()
      .describe('Pública: el mapa la muestra tal cual. Sin nombres ni datos de personas'),
    resuelta: z.boolean(),
  }),
) {}
class ReportesCreadosDto extends createZodDto(z.object({ creados: z.array(z.uuid()) })) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** C20 Reportar necesidad (RF-MOT-011) y la capa de zonas del mapa público (RF-RED-009). */
@ApiTags('reportes')
@Controller()
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @ApiBearerAuth()
  @Roles('RECEPTOR', 'ADMIN')
  @Post('zonas/:id/reportes')
  @ApiOkResponse({ type: ReportesCreadosDto })
  @ApiResponse(errores)
  reportar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: ReportarDto,
  ) {
    return this.reportes.reportar(u, id, d);
  }

  @ApiBearerAuth()
  @Roles('RECEPTOR', 'ADMIN')
  @Get('zonas/:id/reportes')
  @ApiOkResponse({ type: ReporteNecesidadDto, isArray: true })
  @ApiResponse(errores)
  deZona(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.reportes.deZona(u, id);
  }

  @Publico()
  @Get('publico/zonas-necesidad')
  @ApiOkResponse({ type: ZonaPublicaDto, isArray: true })
  capaPublica() {
    return this.reportes.capaPublica();
  }
}
