import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { UbicacionDto } from '../../comun/respuestas';
import { UbicacionesService } from './ubicaciones.service';

class BuscarUbicacionesDto extends createZodDto(
  z.object({ q: z.string().trim().min(1).max(60).optional() }),
) {}

@ApiTags('red')
@ApiBearerAuth()
@Controller('ubicaciones')
export class UbicacionesController {
  constructor(private readonly ubicaciones: UbicacionesService) {}

  /** Selector de la cabecera: las ubicaciones asignadas, por nombre. */
  @Get('mias')
  @ApiOkResponse({ type: UbicacionDto, isArray: true })
  mias(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.ubicaciones.mias(usuario);
  }

  /** Buscador de C16 y matriz de acceso (RF-IDE-011). */
  @Roles('ADMIN', 'AUDITOR')
  @Get()
  @ApiOkResponse({ type: UbicacionDto, isArray: true })
  buscar(@Query() filtro: BuscarUbicacionesDto) {
    return this.ubicaciones.buscar(filtro.q);
  }
}
