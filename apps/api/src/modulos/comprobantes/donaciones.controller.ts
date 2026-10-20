import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { crearDto } from '../../comun/dto';
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

class CrearDonacionDto extends crearDto(
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

const nombrePresentacion = z.string().trim().min(1).max(80);

class ProponerCodigoDto extends crearDto(
  z
    .object({
      ean,
      presentacionId: z.uuid().optional(),
      presentacionNueva: z
        .union([
          z.object({
            categoriaId: z.uuid(),
            nombre: nombrePresentacion,
            tamano: cantidadPositiva,
          }),
          z.object({
            categoriaId: z.uuid(),
            nombre: nombrePresentacion,
            contieneId: z.uuid(),
            unidades: z.number().int().min(2).max(1000),
          }),
        ])
        .optional(),
    })
    .refine(
      (d) => (d.presentacionId === undefined) !== (d.presentacionNueva === undefined),
      'Indica presentacionId o presentacionNueva, no ambas',
    ),
) {}

class SugerenciasDto extends crearDto(
  z.object({
    lineas: z
      .array(z.object({ categoriaId: z.uuid() }))
      .min(1)
      .max(50),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }),
) {}

class ListarDonacionesDto extends crearDto(
  z.object({
    estado: z.enum(['PREPARADO', 'PENDIENTE', 'CONCILIADO', 'RECHAZADO', 'CANCELADO']).optional(),
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
  listar(@UsuarioActual() u: UsuarioAutenticado, @Query() consulta: ListarDonacionesDto) {
    return this.donaciones.listar(u, consulta.estado);
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

  @Post('codigos')
  @ApiCreatedResponse({ type: CodigoDonadorDto })
  @ApiResponse(errores)
  proponer(@UsuarioActual() u: UsuarioAutenticado, @Body() datos: ProponerCodigoDto) {
    return this.donaciones.proponer(u, datos);
  }

  @Get('codigos/:ean')
  @ApiOkResponse({ type: CodigoDonadorDto })
  @ApiResponse(errores)
  codigo(@Param('ean') e: string) {
    return this.donaciones.codigo(e);
  }
}
