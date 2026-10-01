import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { PaginaHistorialDto, SaldoDto } from '../../comun/respuestas';
import { ConsultasService } from './consultas.service';
import { errores } from './movimientos.controller';

class FiltroHistorialDto extends createZodDto(
  z.object({
    categoriaId: z.uuid(),
    cursor: z.string().max(100).optional(),
    limite: z.coerce.number().int().min(1).max(100).optional(),
  }),
) {}

@ApiTags('inventario')
@ApiBearerAuth()
@Controller('acopios/:id')
export class ConsultasController {
  constructor(private readonly consultas: ConsultasService) {}

  @Roles('ADMIN', 'AUDITOR', 'OPERADOR')
  @Get('saldos')
  @ApiOkResponse({ type: SaldoDto, isArray: true })
  @ApiResponse(errores)
  saldos(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.consultas.saldos(usuario, id);
  }

  @Roles('ADMIN', 'AUDITOR', 'OPERADOR')
  @Get('movimientos')
  @ApiOkResponse({ type: PaginaHistorialDto })
  @ApiResponse(errores)
  historial(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filtro: FiltroHistorialDto,
  ) {
    return this.consultas.historial(usuario, id, filtro.categoriaId, filtro);
  }
}
