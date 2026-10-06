import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import {
  ComprobanteDto,
  ErrorDto,
  SugerenciaEntregaDto,
  CodigoDonadorDto,
} from '../../comun/respuestas';
import { cantidadPositiva } from '../../comun/validacion/cantidades';
import { DonacionesService } from './donaciones.service';

const dia = z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`));
const ean = z
  .string()
  .regex(/^\d{8}$|^\d{12,14}$/, 'El código de barras tiene 8, 12, 13 o 14 dígitos');

class CrearDonacionDto extends createZodDto(
  z.object({
    acopioId: z.uuid(),
    lineas: z
      .array(
        z.object({
          categoriaId: z.uuid(),
          ean: ean.optional(),
          cantidad: cantidadPositiva,
          venceEn: dia.optional(),
        }),
      )
      .min(1)
      .max(50)
      .refine(
        (ls) => new Set(ls.map((l) => `${l.categoriaId}:${l.ean ?? ''}`)).size === ls.length,
        'Un mismo producto va en una sola línea',
      ),
  }),
) {}

class SugerenciasDto extends createZodDto(
  z.object({
    lineas: z
      .array(z.object({ categoriaId: z.uuid() }))
      .min(1)
      .max(50),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }),
) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** P9 y P13: el Donador prepara, consulta y cancela sus donaciones. */
@ApiTags('donaciones')
@ApiBearerAuth()
@Roles('DONADOR')
@Controller('donaciones')
export class DonacionesController {
  constructor(private readonly donaciones: DonacionesService) {}

  @Post()
  @ApiCreatedResponse({ type: ComprobanteDto })
  @ApiResponse(errores)
  crear(@UsuarioActual() u: UsuarioAutenticado, @Body() datos: CrearDonacionDto) {
    return this.donaciones.crear(u, datos);
  }

  @Get()
  @ApiOkResponse({ type: [ComprobanteDto] })
  listar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Query('estado') estado?: 'PREPARADO' | 'PENDIENTE' | 'CONCILIADO' | 'RECHAZADO' | 'CANCELADO',
  ) {
    return this.donaciones.listar(u, estado);
  }

  @Post(':folio/cancelar')
  @HttpCode(200)
  @ApiOkResponse({ type: ComprobanteDto })
  @ApiResponse(errores)
  cancelar(@UsuarioActual() u: UsuarioAutenticado, @Param('folio') folio: string) {
    return this.donaciones.cancelar(u, folio);
  }

  @Post('sugerencias')
  @HttpCode(200)
  @ApiOkResponse({ type: [SugerenciaEntregaDto] })
  sugerir(@Body() datos: SugerenciasDto) {
    const ubicacion =
      datos.lat !== undefined && datos.lng !== undefined
        ? { lat: datos.lat, lng: datos.lng }
        : undefined;
    return this.donaciones.sugerir(
      datos.lineas.map((l) => l.categoriaId),
      ubicacion,
    );
  }

  @Get('codigos/:ean')
  @ApiOkResponse({ type: CodigoDonadorDto })
  @ApiResponse(errores)
  codigo(@Param('ean') e: string) {
    return this.donaciones.codigo(e);
  }
}
