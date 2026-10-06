import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ComprobanteDto, ErrorDto, RecepcionDto } from '../../comun/respuestas';
import { cantidadNoNegativa } from '../../comun/validacion/cantidades';
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

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** Recibir por folio (consola, junto a C4). La tarea 9 suma la bandeja C8. */
@ApiTags('comprobantes')
@ApiBearerAuth()
@Controller('comprobantes')
export class ComprobantesController {
  constructor(private readonly recepcion: RecepcionService) {}

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
