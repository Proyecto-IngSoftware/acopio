import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles } from '../../comun/autorizacion/decoradores';
import { BitacoraService } from './bitacora.service';

/** Fecha y hora ISO 8601, por ejemplo 2026-09-28T17:00:00-05:00, o solo la fecha. */
const fechaHora = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((v) => new Date(v));

class FiltroBitacoraDto extends createZodDto(
  z.object({
    usuarioId: z.uuid().optional(),
    ubicacionId: z.uuid().optional(),
    accion: z.string().optional(),
    entidad: z.string().optional(),
    destacado: z.stringbool().optional(),
    desde: fechaHora.optional(),
    hasta: fechaHora.optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    porPagina: z.coerce.number().int().min(1).max(100).default(50),
  }),
) {}

@ApiTags('bitácora')
@ApiBearerAuth()
@Controller('bitacora')
export class BitacoraController {
  constructor(private readonly bitacora: BitacoraService) {}

  /** Consulta de solo lectura para Administrador y Auditor (RF-IDE-012, C17). */
  @Roles('ADMIN', 'AUDITOR')
  @Get()
  buscar(@Query() filtro: FiltroBitacoraDto) {
    return this.bitacora.buscar(filtro);
  }
}
