import { Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles } from '../../comun/autorizacion/decoradores';
import { RecalculoDto, SugerenciaDto } from '../../comun/respuestas';
import { SugerenciasService } from './sugerencias.service';

class FiltroSugerenciasDto extends createZodDto(
  z.object({
    zona: z.uuid().optional(),
    acopio: z.uuid().optional(),
    categoria: z.uuid().optional(),
    estado: z.enum(['PROPUESTA', 'APROBADA', 'DESCARTADA']).optional(),
  }),
) {}

/** C11 Motor de sugerencias. Solo el Administrador. */
@ApiTags('motor')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('sugerencias')
export class SugerenciasController {
  constructor(private readonly sugerencias: SugerenciasService) {}

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
}
