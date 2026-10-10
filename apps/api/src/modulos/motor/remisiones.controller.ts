import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDto, RemisionDto } from '../../comun/respuestas';
import { cantidadPositiva } from '../../comun/validacion/cantidades';
import { RemisionesService } from './remisiones.service';

const lineas = z
  .array(z.object({ categoriaId: z.uuid(), cantidad: cantidadPositiva }))
  .min(1)
  .max(40);
const responsable = z.string().trim().max(120).nullable();

class CrearRemisionDto extends createZodDto(
  z.object({
    acopioId: z.uuid(),
    zonaId: z.uuid().nullable().describe('null: despacho general'),
    responsable: responsable.optional(),
    lineas,
  }),
) {}
class LineasDto extends createZodDto(z.object({ lineas })) {}
class EditarRemisionDto extends createZodDto(
  z.object({ responsable: responsable.optional(), zonaId: z.uuid().nullable().optional() }),
) {}
class DespacharDto extends createZodDto(
  z.object({ folios: z.array(z.string().trim().min(1)).max(20).optional() }),
) {}
class CancelarDto extends createZodDto(z.object({ motivo: z.string().trim().min(10).max(280) })) {}
class FiltroRemisionesDto extends createZodDto(
  z.object({
    estado: z.enum(['BORRADOR', 'EN_TRANSITO', 'RECIBIDA', 'CANCELADA']).optional(),
    zona: z.uuid().optional(),
  }),
) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** C12 Remisiones (RF-MOT-008). El Operador del acopio de origen y el Administrador. */
@ApiTags('remisiones')
@ApiBearerAuth()
@Roles('ADMIN', 'OPERADOR')
@Controller('remisiones')
export class RemisionesController {
  constructor(private readonly remisiones: RemisionesService) {}

  @Post()
  @ApiOkResponse({ type: RemisionDto })
  @ApiResponse(errores)
  crear(@UsuarioActual() u: UsuarioAutenticado, @Body() d: CrearRemisionDto) {
    return this.remisiones.crear(u, d);
  }

  @Get()
  @ApiOkResponse({ type: RemisionDto, isArray: true })
  listar(@UsuarioActual() u: UsuarioAutenticado, @Query() f: FiltroRemisionesDto) {
    return this.remisiones.listar(u, { estado: f.estado, zonaId: f.zona });
  }

  @Get(':codigo')
  @ApiOkResponse({ type: RemisionDto })
  @ApiResponse(errores)
  ver(@UsuarioActual() u: UsuarioAutenticado, @Param('codigo') codigo: string) {
    return this.remisiones.ver(u, codigo);
  }

  @Put(':codigo/lineas')
  @ApiOkResponse({ type: RemisionDto })
  @ApiResponse(errores)
  lineas(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('codigo') codigo: string,
    @Body() d: LineasDto,
  ) {
    return this.remisiones.reemplazarLineas(u, codigo, d.lineas);
  }

  @Post(':codigo/despachar')
  @HttpCode(200)
  @ApiOkResponse({ type: RemisionDto })
  @ApiResponse(errores)
  despachar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('codigo') codigo: string,
    @Body() d: DespacharDto,
  ) {
    return this.remisiones.despachar(u, codigo, d.folios);
  }

  @Post(':codigo/cancelar')
  @HttpCode(200)
  @ApiOkResponse({ type: RemisionDto })
  @ApiResponse(errores)
  cancelar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('codigo') codigo: string,
    @Body() d: CancelarDto,
  ) {
    return this.remisiones.cancelar(u, codigo, d.motivo);
  }

  @Patch(':codigo')
  @ApiOkResponse({ type: RemisionDto })
  @ApiResponse(errores)
  editar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('codigo') codigo: string,
    @Body() d: EditarRemisionDto,
  ) {
    return this.remisiones.editar(u, codigo, d);
  }
}
