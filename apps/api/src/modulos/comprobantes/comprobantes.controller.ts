import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import {
  BandejaRespuestaDto,
  ComprobanteDto,
  ConciliacionDto,
  EntradaVinculableDto,
  ErrorDto,
  RecepcionDto,
} from '../../comun/respuestas';
import { cantidadNoNegativa } from '../../comun/validacion/cantidades';
import { ConciliacionService } from './conciliacion.service';
import { RecepcionService } from './recepcion.service';

const dia = z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`));

class RecibirDto extends createZodDto(
  z.object({
    acopioId: z.uuid(),
    lineas: z
      .array(
        z.object({
          lineaId: z.uuid(),
          cantidadConfirmada: cantidadNoNegativa,
          venceEn: dia.optional(),
          motivoDiferencia: z.string().max(280).optional(),
        }),
      )
      .min(1)
      .max(50),
  }),
) {}

const finDelDia = z.iso.date().transform((d) => new Date(`${d}T23:59:59.999Z`));

class BandejaDto extends createZodDto(
  z.object({
    estado: z.enum(['PENDIENTE', 'CONCILIADO', 'RECHAZADO']).optional(),
    acopioId: z.uuid().optional(),
    desde: dia.optional(),
    hasta: finDelDia.optional(),
  }),
) {}
class VincularDto extends createZodDto(
  z.object({ movimientoIds: z.array(z.uuid()).min(1).max(50) }),
) {}
class RechazarDto extends createZodDto(
  z
    .object({
      motivo: z.enum(['DUPLICADO', 'NO_CUADRA_MOVIMIENTOS', 'DIFERENCIA_SIN_EXPLICAR', 'OTRO']),
      nota: z.string().trim().max(500).optional(),
    })
    .refine((d) => d.motivo !== 'OTRO' || (d.nota?.length ?? 0) > 0, {
      message: 'Con «Otro» escribe el motivo',
      path: ['nota'],
    }),
) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** Recibir por folio (consola, junto a C4) y la bandeja del Auditor (C8). */
@ApiTags('comprobantes')
@ApiBearerAuth()
@Controller('comprobantes')
export class ComprobantesController {
  constructor(
    private readonly recepcion: RecepcionService,
    private readonly conciliacion: ConciliacionService,
  ) {}

  @Roles('AUDITOR', 'ADMIN')
  @Get()
  @ApiOkResponse({ type: BandejaRespuestaDto })
  bandeja(@UsuarioActual() u: UsuarioAutenticado, @Query() filtro: BandejaDto) {
    return this.conciliacion.bandeja(u, filtro);
  }

  @Roles('AUDITOR', 'ADMIN')
  @Get(':folio/conciliacion')
  @ApiOkResponse({ type: ConciliacionDto })
  @ApiResponse(errores)
  detalle(@UsuarioActual() u: UsuarioAutenticado, @Param('folio') folio: string) {
    return this.conciliacion.detalle(u, folio);
  }

  @Roles('AUDITOR', 'ADMIN')
  @Get(':folio/entradas-vinculables')
  @ApiOkResponse({ type: [EntradaVinculableDto] })
  @ApiResponse(errores)
  vinculables(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('folio') folio: string,
    @Query('acopioId', new ParseUUIDPipe({ optional: true })) acopioId?: string,
  ) {
    return this.conciliacion.vinculables(u, folio, acopioId);
  }

  @Roles('AUDITOR', 'ADMIN')
  @Post(':folio/vinculos')
  @HttpCode(200)
  @ApiOkResponse({ type: ComprobanteDto })
  @ApiResponse(errores)
  vincular(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('folio') folio: string,
    @Body() d: VincularDto,
  ) {
    return this.conciliacion.vincular(u, folio, d.movimientoIds);
  }

  @Roles('AUDITOR', 'ADMIN')
  @Post(':folio/conciliar')
  @HttpCode(200)
  @ApiOkResponse({ type: ComprobanteDto })
  @ApiResponse(errores)
  conciliar(@UsuarioActual() u: UsuarioAutenticado, @Param('folio') folio: string) {
    return this.conciliacion.conciliar(u, folio);
  }

  @Roles('AUDITOR', 'ADMIN')
  @Post(':folio/rechazar')
  @HttpCode(200)
  @ApiOkResponse({ type: ComprobanteDto })
  @ApiResponse(errores)
  rechazar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('folio') folio: string,
    @Body() d: RechazarDto,
  ) {
    return this.conciliacion.rechazar(u, folio, d);
  }

  @Roles('AUDITOR', 'ADMIN')
  @Post(':folio/revertir-rechazo')
  @HttpCode(200)
  @ApiOkResponse({ type: ComprobanteDto })
  @ApiResponse(errores)
  revertir(@UsuarioActual() u: UsuarioAutenticado, @Param('folio') folio: string) {
    return this.conciliacion.revertirRechazo(u, folio);
  }

  @Roles('OPERADOR', 'AUDITOR', 'ADMIN')
  @Get(':folio')
  @ApiOkResponse({ type: ComprobanteDto })
  @ApiResponse(errores)
  consultar(@Param('folio') folio: string) {
    return this.recepcion.consultar(folio);
  }

  @Roles('OPERADOR')
  @Post(':folio/recepcion')
  @HttpCode(200)
  @ApiOkResponse({ type: RecepcionDto })
  @ApiResponse(errores)
  recibir(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('folio') folio: string,
    @Body() datos: RecibirDto,
  ) {
    return this.recepcion.recibir(u, folio, datos);
  }
}
