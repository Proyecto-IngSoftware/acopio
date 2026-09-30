import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Publico, Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { AcopioNoRecibeDto, ErrorDto, NoRecibirDto } from '../../comun/respuestas';
import { NoRecibirService } from './no-recibir.service';

class MarcarDto extends createZodDto(
  z.object({
    hasta: z.iso
      .date()
      .transform((d) => new Date(`${d}T00:00:00Z`))
      .nullable()
      .optional()
      .describe('Fecha de reapertura; sin ella, hasta que se desmarque'),
  }),
) {}
class FiltroCategoriaDto extends createZodDto(z.object({ categoria: z.uuid() })) {}

const errores = {
  status: 'default' as const,
  type: ErrorDto,
  description: 'Error con forma { estado, codigo, mensaje, detalles? }',
};

/** C7 No recibir, la ficha pública y el filtro «qué no recibe» del mapa. */
@ApiTags('inventario')
@Controller()
export class NoRecibirController {
  constructor(private readonly noRecibir: NoRecibirService) {}

  @Publico()
  @ApiOperation({ summary: 'Lo que un acopio no recibe hoy. No exige sesión', security: [] })
  @Get('acopios/:id/no-recibir')
  @ApiOkResponse({ type: NoRecibirDto, isArray: true })
  listar(@Param('id', ParseUUIDPipe) id: string) {
    return this.noRecibir.listar(id);
  }

  @Publico()
  @ApiOperation({
    summary: 'Acopios que no reciben una categoría. No exige sesión',
    security: [],
  })
  @Get('no-recibir')
  @ApiOkResponse({ type: AcopioNoRecibeDto, isArray: true })
  porCategoria(@Query() filtro: FiltroCategoriaDto) {
    return this.noRecibir.porCategoria(filtro.categoria);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'OPERADOR')
  @Put('acopios/:id/no-recibir/:categoriaId')
  @ApiOkResponse({ type: NoRecibirDto })
  @ApiResponse(errores)
  marcar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('categoriaId', ParseUUIDPipe) categoriaId: string,
    @Body() datos: MarcarDto,
  ) {
    return this.noRecibir.marcar(usuario, id, categoriaId, datos.hasta ?? null);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'OPERADOR')
  @Delete('acopios/:id/no-recibir/:categoriaId')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiResponse(errores)
  async desmarcar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('categoriaId', ParseUUIDPipe) categoriaId: string,
  ) {
    await this.noRecibir.desmarcar(usuario, id, categoriaId);
  }
}
