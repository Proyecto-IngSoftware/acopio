import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
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
import { EntidadDto, ErrorDto } from '../../comun/respuestas';
import { EntidadesService } from './entidades.service';

const opcional = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

class CrearEntidadDto extends createZodDto(
  z.object({
    nombre: z.string().trim().min(2).max(120),
    tipo: z.string().trim().min(2).max(60).describe('Fundación, ONG, alcaldía, iglesia…'),
    nit: opcional(20),
    sitioWeb: z.url().nullable().optional(),
    telefono: opcional(30),
    correo: z.email().nullable().optional(),
    descripcion: opcional(1000),
  }),
) {}
class ActualizarEntidadDto extends createZodDto(CrearEntidadDto.schema.partial()) {}

const errores = {
  status: 'default' as const,
  type: ErrorDto,
  description: 'Error con forma { estado, codigo, mensaje, detalles? }',
};

/** C15 Entidades (RF-RED-005). Solo el Administrador. */
@ApiTags('red')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('entidades')
export class EntidadesController {
  constructor(private readonly entidades: EntidadesService) {}

  @Get()
  @ApiOkResponse({ type: EntidadDto, isArray: true })
  listar() {
    return this.entidades.listar();
  }

  @Post()
  @ApiCreatedResponse({ type: EntidadDto })
  @ApiResponse(errores)
  crear(@UsuarioActual() admin: UsuarioAutenticado, @Body() datos: CrearEntidadDto) {
    return this.entidades.crear(admin, datos);
  }

  @Patch(':id')
  @ApiOkResponse({ type: EntidadDto })
  @ApiResponse(errores)
  actualizar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cambios: ActualizarEntidadDto,
  ) {
    return this.entidades.actualizar(admin, id, cambios);
  }
}
