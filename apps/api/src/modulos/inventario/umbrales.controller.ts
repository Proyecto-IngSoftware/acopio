import { Body, Controller, Delete, HttpCode, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { UmbralDto } from '../../comun/respuestas';
import { errores } from './movimientos.controller';
import { UmbralesService } from './umbrales.service';

const valor = z
  .number()
  .min(0)
  .lt(1_000_000_000)
  .refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6, 'Máximo 3 decimales');

class FijarUmbralDto extends createZodDto(
  z.object({ minimo: valor, maximo: valor }).refine((u) => u.minimo <= u.maximo, {
    message: 'El mínimo no puede ser mayor que el máximo',
    path: ['minimo'],
  }),
) {}

/** C7 Umbrales y no recibir. */
@ApiTags('inventario')
@ApiBearerAuth()
@Controller('acopios/:id/umbrales')
export class UmbralesController {
  constructor(private readonly umbrales: UmbralesService) {}

  @Roles('ADMIN', 'OPERADOR')
  @Put(':categoriaId')
  @ApiOkResponse({ type: UmbralDto })
  @ApiResponse(errores)
  fijar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('categoriaId', ParseUUIDPipe) categoriaId: string,
    @Body() datos: FijarUmbralDto,
  ) {
    return this.umbrales.fijar(usuario, id, categoriaId, datos);
  }

  @Roles('ADMIN', 'OPERADOR')
  @Delete(':categoriaId')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiResponse(errores)
  async quitar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('categoriaId', ParseUUIDPipe) categoriaId: string,
  ) {
    await this.umbrales.quitar(usuario, id, categoriaId);
  }
}
