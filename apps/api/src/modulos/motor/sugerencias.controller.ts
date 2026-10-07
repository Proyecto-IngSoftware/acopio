import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import {
  AprobacionDto,
  DescarteDto,
  ErrorDto,
  InformeDescartesDto,
  RecalculoDto,
  SugerenciaDto,
} from '../../comun/respuestas';
import { cantidadPositiva } from '../../comun/validacion/cantidades';
import { SugerenciasService } from './sugerencias.service';

class FiltroSugerenciasDto extends createZodDto(
  z.object({
    zona: z.uuid().optional(),
    acopio: z.uuid().optional(),
    categoria: z.uuid().optional(),
    estado: z.enum(['PROPUESTA', 'APROBADA', 'DESCARTADA']).optional(),
  }),
) {}

class AprobarDto extends createZodDto(z.object({ cantidad: cantidadPositiva.optional() })) {}
class DescartarDto extends createZodDto(z.object({ motivo: z.string().trim().min(10).max(280) })) {}
const dia = z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`));
const finDelDia = z.iso.date().transform((d) => new Date(`${d}T23:59:59.999Z`));
class RangoDto extends createZodDto(
  z.object({ desde: dia.optional(), hasta: finDelDia.optional() }),
) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** C11 Motor de sugerencias. Solo el Administrador. */
@ApiTags('motor')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('sugerencias')
export class SugerenciasController {
  constructor(private readonly sugerencias: SugerenciasService) {}

  @Get('descartes')
  @ApiOkResponse({ type: InformeDescartesDto })
  descartes(@Query() r: RangoDto) {
    return this.sugerencias.descartes(r.desde, r.hasta);
  }

  @Get()
  @ApiOkResponse({ type: SugerenciaDto, isArray: true })
  listar(@Query() f: FiltroSugerenciasDto) {
    return this.sugerencias.listar({
      zonaId: f.zona,
      acopioId: f.acopio,
      categoriaId: f.categoria,
      estado: f.estado,
    });
  }

  @Post('recalcular')
  @HttpCode(200)
  @ApiOkResponse({ type: RecalculoDto })
  recalcular() {
    return this.sugerencias.recalcular();
  }

  @Post(':id/aprobar')
  @HttpCode(200)
  @ApiOkResponse({ type: AprobacionDto })
  @ApiResponse(errores)
  aprobar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AprobarDto,
  ) {
    return this.sugerencias.aprobar(admin, id, d.cantidad);
  }

  @Post(':id/descartar')
  @HttpCode(200)
  @ApiOkResponse({ type: DescarteDto })
  @ApiResponse(errores)
  descartar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: DescartarDto,
  ) {
    return this.sugerencias.descartar(admin, id, d.motivo);
  }
}
