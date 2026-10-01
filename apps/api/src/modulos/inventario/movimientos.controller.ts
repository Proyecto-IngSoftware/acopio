import { Body, Controller, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDto, ResultadoMovimientoDto } from '../../comun/respuestas';
import { MovimientosService } from './movimientos.service';

/** Mayor que cero, hasta 3 decimales y menos de mil millones (numeric(12,3)). */
export const cantidad = z
  .number()
  .positive()
  .lt(1_000_000_000)
  .refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6, 'Máximo 3 decimales');

const dia = z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`));

class EntradaDto extends createZodDto(
  z.object({
    id: z.uuid().optional(),
    categoriaId: z.uuid(),
    cantidad,
    venceEn: dia.optional(),
    ocurridoEn: z.iso
      .datetime({ offset: true })
      .transform((t) => new Date(t))
      .optional(),
    origenOffline: z.boolean().optional(),
  }),
) {}

class SalidaDto extends createZodDto(
  z.object({
    categoriaId: z.uuid(),
    cantidad,
    motivoSalida: z.enum(['ENTREGA_FAMILIAS', 'TRASLADO', 'VENCIDO', 'OTRO']),
    nota: z.string().max(280).optional(),
  }),
) {}

class AjusteDto extends createZodDto(
  z.object({
    categoriaId: z.uuid(),
    cantidadContada: z
      .number()
      .min(0)
      .lt(1_000_000_000)
      .refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6, 'Máximo 3 decimales'),
    motivo: z.string().trim().min(10, 'El motivo necesita al menos 10 caracteres').max(500),
  }),
) {}

export const errores = {
  status: 'default' as const,
  type: ErrorDto,
  description: 'Error con forma { estado, codigo, mensaje, detalles? }',
};

/** C4 Entrada rápida, C5 Salida y C6 Conteo físico. */
@ApiTags('inventario')
@ApiBearerAuth()
@Controller('acopios/:id')
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  @Roles('OPERADOR')
  @Post('entradas')
  @ApiCreatedResponse({ type: ResultadoMovimientoDto, description: 'Movimiento nuevo' })
  @ApiOkResponse({
    type: ResultadoMovimientoDto,
    description: 'Reintento: el movimiento ya existía',
  })
  @ApiResponse(errores)
  async entrada(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: EntradaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { resultado, nuevo } = await this.movimientos.entrada(usuario, id, {
      id: datos.id,
      categoriaId: datos.categoriaId,
      cantidad: datos.cantidad,
      venceEn: datos.venceEn ?? null,
      ocurridoEn: datos.ocurridoEn ?? null,
      origenOffline: datos.origenOffline ?? false,
    });
    res.status(nuevo ? 201 : 200);
    return resultado;
  }

  @Roles('OPERADOR')
  @Post('salidas')
  @ApiCreatedResponse({ type: ResultadoMovimientoDto })
  @ApiResponse(errores)
  salida(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: SalidaDto,
  ) {
    return this.movimientos.salida(usuario, id, { ...datos, nota: datos.nota ?? null });
  }

  @Roles('OPERADOR')
  @Post('ajustes')
  @ApiCreatedResponse({ type: ResultadoMovimientoDto })
  @ApiResponse(errores)
  ajuste(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: AjusteDto,
  ) {
    return this.movimientos.ajuste(usuario, id, datos);
  }
}
