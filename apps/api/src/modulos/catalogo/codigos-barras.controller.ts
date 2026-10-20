import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { crearDto } from '../../comun/dto';
import { CodigoBarrasDto } from '../../comun/respuestas';
import { CodigosBarrasService } from './codigos-barras.service';

// EAN-8, UPC-A (12), EAN-13 y GTIN-14
const ean = z.string().regex(/^(\d{8}|\d{12,14})$/, 'El código debe tener 8, 12, 13 o 14 dígitos');

class AsociarDto extends crearDto(z.object({ ean, presentacionId: z.uuid() })) {}
class ValidarDto extends crearDto(z.object({ presentacionId: z.uuid() })) {}
class EditarCodigoDto extends crearDto(
  z.object({
    presentacionId: z.uuid().optional(),
    estado: z.literal('VALIDADO').optional(),
    porRevisar: z.literal(false).optional(),
  }),
) {}
class FiltroCodigosDto extends crearDto(
  z.object({
    q: z.string().trim().max(120).optional().describe('EAN (prefijo), categoría o presentación'),
    estado: z.enum(['PROPUESTO', 'VALIDADO']).optional(),
    categoriaId: z.uuid().optional(),
  }),
) {}
class EanDto extends crearDto(z.object({ ean })) {}

/** C4 (escáner) y la pestaña «Códigos de barras» de C18. */
@ApiTags('catalogo')
@ApiBearerAuth()
@Controller('codigos-barras')
export class CodigosBarrasController {
  constructor(private readonly codigos: CodigosBarrasService) {}

  @Roles('ADMIN')
  @Get()
  @ApiOkResponse({ type: CodigoBarrasDto, isArray: true })
  listar(@Query() filtro: FiltroCodigosDto) {
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
    return this.codigos.asociar(usuario, datos.ean, datos.presentacionId);
  }

  @Roles('ADMIN', 'OPERADOR')
  @Post(':ean/validar')
  @ApiCreatedResponse({ type: CodigoBarrasDto })
  validar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param() p: EanDto,
    @Body() datos: ValidarDto,
  ) {
    return this.codigos.validar(usuario, p.ean, datos.presentacionId);
  }

  @Roles('ADMIN')
  @Patch(':ean')
  @ApiOkResponse({ type: CodigoBarrasDto })
  editar(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param() p: EanDto,
    @Body() cambios: EditarCodigoDto,
  ) {
    return this.codigos.editar(usuario, p.ean, cambios);
  }
}
