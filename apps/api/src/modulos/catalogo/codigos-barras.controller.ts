import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { CodigoBarrasDto } from '../../comun/respuestas';
import { CodigosBarrasService } from './codigos-barras.service';

// EAN-8, UPC-A (12), EAN-13 y GTIN-14
const ean = z.string().regex(/^(\d{8}|\d{12,14})$/, 'El código debe tener 8, 12, 13 o 14 dígitos');
const contenido = z.number().positive().lt(1_000_000).nullable().optional();

class AsociarDto extends createZodDto(
  z.object({
    ean,
    categoriaId: z.uuid(),
    contenido,
    descripcion: z.string().trim().max(120).nullable().optional(),
  }),
) {}
class EditarDto extends createZodDto(
  z.object({
    categoriaId: z.uuid().optional(),
    contenido,
    descripcion: z.string().trim().max(120).nullable().optional(),
    revisado: z.boolean().optional(),
  }),
) {}
class FiltroDto extends createZodDto(
  z.object({
    revisado: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  }),
) {}
class EanDto extends createZodDto(z.object({ ean })) {}

/** C4 (escáner) y la pestaña «Códigos de barras» de C18. */
@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('codigos-barras')
export class CodigosBarrasController {
  constructor(private readonly codigos: CodigosBarrasService) {}

  @Roles('ADMIN')
  @Get()
  @ApiOkResponse({ type: CodigoBarrasDto, isArray: true })
  listar(@Query() filtro: FiltroDto) {
    return this.codigos.listar(filtro);
  }

  @Roles('ADMIN', 'OPERADOR')
  @Get(':ean')
  @ApiOkResponse({ type: CodigoBarrasDto })
  obtener(@Param() p: EanDto) {
    return this.codigos.obtener(p.ean);
  }

  @Roles('ADMIN', 'OPERADOR')
  @Post()
  @ApiCreatedResponse({ type: CodigoBarrasDto })
  asociar(@UsuarioActual() usuario: UsuarioAutenticado, @Body() datos: AsociarDto) {
    return this.codigos.asociar(usuario, {
      ean: datos.ean,
      categoriaId: datos.categoriaId,
      contenido: datos.contenido ?? null,
      descripcion: datos.descripcion ?? null,
    });
  }

  @Roles('ADMIN')
  @Patch(':ean')
  @ApiOkResponse({ type: CodigoBarrasDto })
  editar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param() p: EanDto,
    @Body() cambios: EditarDto,
  ) {
    return this.codigos.editar(usuario, p.ean, cambios);
  }
}
