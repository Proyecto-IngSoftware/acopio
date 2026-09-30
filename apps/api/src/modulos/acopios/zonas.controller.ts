import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDto, ZonaDto } from '../../comun/respuestas';
import { ZonasService } from './zonas.service';

const fecha = z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`));
const texto = (max: number) => z.string().trim().min(1).max(max);

class FiltroZonasDto extends createZodDto(z.object({ emergencia: z.uuid().optional() })) {}
class CrearZonaDto extends createZodDto(
  z.object({
    emergenciaId: z.uuid(),
    nombre: texto(120),
    municipio: texto(80),
    lat: z.number().min(-5).max(14),
    lng: z.number().min(-82).max(-66),
    poblacionEstimada: z.number().int().min(0),
    poblacionFuente: texto(200),
    poblacionFecha: fecha,
    estado: z.enum(['SIN_ATENDER', 'EN_ATENCION', 'CUBIERTA']).optional(),
  }),
) {}
class ActualizarZonaDto extends createZodDto(
  CrearZonaDto.schema.omit({ emergenciaId: true }).partial(),
) {}

const errores = {
  status: 'default' as const,
  type: ErrorDto,
  description: 'Error con forma { estado, codigo, mensaje, detalles? }',
};

/** C9 Zonas (RF-MOT-001). Solo el Administrador. */
@ApiTags('red')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('zonas')
export class ZonasController {
  constructor(private readonly zonas: ZonasService) {}

  @Get()
  @ApiOkResponse({ type: ZonaDto, isArray: true })
  listar(@Query() filtro: FiltroZonasDto) {
    return this.zonas.listar(filtro.emergencia);
  }

  @Post()
  @ApiCreatedResponse({ type: ZonaDto })
  @ApiResponse(errores)
  crear(@UsuarioActual() admin: UsuarioAutenticado, @Body() datos: CrearZonaDto) {
    return this.zonas.crear(admin, datos);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ZonaDto })
  @ApiResponse(errores)
  actualizar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cambios: ActualizarZonaDto,
  ) {
    return this.zonas.actualizar(admin, id, cambios);
  }
}
