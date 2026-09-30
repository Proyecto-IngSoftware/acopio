import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Publico, Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { AcopioDto, AcopioPublicoDto, ErrorDto } from '../../comun/respuestas';
import { AcopiosService } from './acopios.service';

const lat = z.number().min(-5).max(14);
const lng = z.number().min(-82).max(-66);
const tramo = z.object({ abre: z.string(), cierra: z.string() });
const horario = z.object({
  dom: z.array(tramo).max(4),
  lun: z.array(tramo).max(4),
  mar: z.array(tramo).max(4),
  mie: z.array(tramo).max(4),
  jue: z.array(tramo).max(4),
  vie: z.array(tramo).max(4),
  sab: z.array(tramo).max(4),
});
const texto = (max: number) => z.string().trim().min(1).max(max);

class FiltroPublicoDto extends createZodDto(
  z.object({
    abiertoAhora: z.stringbool().default(false),
    cerca: z
      .string()
      .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'Usa «lat,lng», por ejemplo 4.61,-74.08')
      .transform((s) => {
        const [la, ln] = s.split(',').map(Number);
        return { lat: la!, lng: ln! };
      })
      .pipe(z.object({ lat, lng }))
      .optional(),
  }),
) {}
class CrearAcopioDto extends createZodDto(
  z.object({
    entidadId: z.uuid(),
    nombre: texto(120),
    direccion: texto(200),
    municipio: texto(80),
    lat,
    lng,
    telefono: texto(30).nullable().optional(),
    indicacionesAcceso: texto(500).nullable().optional(),
    horario,
    estado: z.enum(['ACTIVO', 'PAUSADO', 'CERRADO']).optional(),
  }),
) {}
class ActualizarAcopioDto extends createZodDto(CrearAcopioDto.schema.partial()) {}
class OperacionDto extends createZodDto(
  z.object({
    estado: z.enum(['ACTIVO', 'PAUSADO']).optional(),
    horario: horario.optional(),
    indicacionesAcceso: texto(500).nullable().optional(),
    telefono: texto(30).nullable().optional(),
  }),
) {}

const errores = {
  status: 'default' as const,
  type: ErrorDto,
  description: 'Error con forma { estado, codigo, mensaje, detalles? }',
};

/** Acopios: mapa y ficha públicos (P5, P6), gestión (C21) y operación (Mi acopio). */
@ApiTags('red')
@Controller('acopios')
export class AcopiosController {
  constructor(private readonly acopios: AcopiosService) {}

  @Publico()
  @ApiOperation({
    summary: 'Acopios activos y pausados para el mapa. No exige sesión',
    security: [],
  })
  @Get()
  @ApiOkResponse({ type: AcopioPublicoDto, isArray: true })
  listarPublicos(@Query() filtro: FiltroPublicoDto) {
    return this.acopios.listarPublicos(filtro);
  }

  // Antes de ':id' para que «gestion» no se lea como identificador
  @ApiBearerAuth()
  @Roles('ADMIN', 'OPERADOR')
  @Get('gestion')
  @ApiOkResponse({ type: AcopioDto, isArray: true })
  listarGestion(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.acopios.listarGestion(usuario);
  }

  @Publico()
  @ApiOperation({ summary: 'Ficha pública de un acopio. No exige sesión', security: [] })
  @Get(':id')
  @ApiOkResponse({ type: AcopioPublicoDto })
  @ApiResponse(errores)
  obtenerPublico(@Param('id', ParseUUIDPipe) id: string) {
    return this.acopios.obtenerPublico(id);
  }

  @ApiBearerAuth()
  @Roles('ADMIN')
  @Post()
  @ApiCreatedResponse({ type: AcopioDto })
  @ApiResponse(errores)
  crear(@UsuarioActual() admin: UsuarioAutenticado, @Body() datos: CrearAcopioDto) {
    return this.acopios.crear(admin, datos);
  }

  @ApiBearerAuth()
  @Roles('ADMIN')
  @Patch(':id')
  @ApiOkResponse({ type: AcopioDto })
  @ApiResponse(errores)
  actualizar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cambios: ActualizarAcopioDto,
  ) {
    return this.acopios.actualizar(admin, id, cambios);
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'OPERADOR')
  @Patch(':id/operacion')
  @ApiOkResponse({ type: AcopioDto })
  @ApiResponse(errores)
  operar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cambios: OperacionDto,
  ) {
    return this.acopios.operar(usuario, id, cambios);
  }
}
