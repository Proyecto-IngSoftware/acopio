import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { crearDto } from '../../comun/dto';
import { PresentacionDto } from '../../comun/respuestas';
import { cantidadPositiva } from '../../comun/validacion/cantidades';
import { PresentacionesService } from './presentaciones.service';

const nombre = z.string().trim().min(1).max(80);
const unidades = z.number().int().min(2).max(1000);

class FiltroDto extends crearDto(z.object({ categoriaId: z.uuid() })) {}
class IdDto extends crearDto(z.object({ id: z.uuid() })) {}
class CrearDto extends crearDto(
  z
    .object({
      categoriaId: z.uuid(),
      nombre,
      tamano: cantidadPositiva.optional(),
      contieneId: z.uuid().optional(),
      unidades: unidades.optional(),
    })
    .refine(
      (d) =>
        d.contieneId === undefined
          ? d.tamano !== undefined && d.unidades === undefined
          : d.tamano === undefined && d.unidades !== undefined,
      'Una suelta lleva tamano; un paquete lleva contieneId y unidades',
    ),
) {}
class EditarDto extends crearDto(
  z.object({
    nombre: nombre.optional(),
    tamano: cantidadPositiva.optional(),
    contieneId: z.uuid().optional(),
    unidades: unidades.optional(),
    estado: z.literal('VALIDADO').optional(),
  }),
) {}

/** Presentaciones de una categoría (ADR-0021). */
@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('presentaciones')
export class PresentacionesController {
  constructor(private readonly presentaciones: PresentacionesService) {}

  @Roles('ADMIN', 'OPERADOR', 'DONADOR')
  @Get()
  @ApiOkResponse({ type: PresentacionDto, isArray: true })
  listar(@UsuarioActual() usuario: UsuarioAutenticado, @Query() filtro: FiltroDto) {
    return this.presentaciones.listar(usuario, filtro.categoriaId);
  }

  @Roles('ADMIN', 'OPERADOR')
  @Post()
  @ApiCreatedResponse({ type: PresentacionDto })
  crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: CrearDto) {
    return this.presentaciones.crear(usuario, datos);
  }

  @Roles('ADMIN')
  @Patch(':id')
  @ApiOkResponse({ type: PresentacionDto })
  editar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param() p: IdDto,
    @Body() cambios: EditarDto,
  ) {
    return this.presentaciones.editar(usuario, p.id, cambios);
  }
}
