import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CATEGORIAS_CAUSA } from '@acopio/shared';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { crearDto } from '../../comun/dto';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { CausaGestionDto, ErrorDto } from '../../comun/respuestas';
import { TAMANO_MAXIMO } from '../almacenamiento/imagenes';
import { CausasService } from './causas.service';

const fechaCierre = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD');
const confirmo = z
  .boolean()
  .optional()
  .describe('Confirmo que revisé la entidad y el sitio de destino (C-09)');

const camposCausa = z.object({
  entidadId: z.uuid(),
  categoria: z.enum(CATEGORIAS_CAUSA),
  titulo: z.string().trim().min(5).max(120),
  descripcion: z.string().trim().min(20).max(2000),
  pasos: z.array(z.string().trim().min(3).max(300)).min(1).max(10),
  urlOficial: z.string().trim().max(500),
  cierraEl: fechaCierre,
});

class CrearCausaDto extends crearDto(camposCausa.extend({ confirmo })) {}
class EditarCausaDto extends crearDto(camposCausa.partial().extend({ confirmo })) {}
class PlazoDto extends crearDto(z.object({ cierraEl: fechaCierre, confirmo })) {}
class FiltroGestionDto extends crearDto(
  z.object({ estado: z.enum(['activas', 'por-cerrar', 'atendidas']).default('activas') }),
) {}

const errores = {
  status: 'default' as const,
  type: ErrorDto,
  description: 'Error con forma { estado, codigo, mensaje, detalles? }',
};

/** C22 Causas (RF-RED-007 y 010). Solo el Administrador. */
@ApiTags('causas')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('causas')
export class CausasController {
  constructor(private readonly causas: CausasService) {}

  @Get('gestion')
  @ApiOkResponse({ type: CausaGestionDto, isArray: true })
  listar(@Query() filtro: FiltroGestionDto) {
    return this.causas.listarGestion(filtro.estado);
  }

  @Post()
  @ApiCreatedResponse({ type: CausaGestionDto })
  @ApiResponse(errores)
  crear(@UsuarioActual() admin: UsuarioAutenticado, @Body() datos: CrearCausaDto) {
    const { confirmo: ok, ...resto } = datos;
    return this.causas.crear(admin, resto, ok === true);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CausaGestionDto })
  @ApiResponse(errores)
  editar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cambios: EditarCausaDto,
  ) {
    const { confirmo: ok, ...resto } = cambios;
    return this.causas.editar(admin, id, resto, ok === true);
  }

  @Post(':id/renovar')
  @HttpCode(200)
  @ApiOkResponse({ type: CausaGestionDto })
  @ApiResponse(errores)
  renovar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() plazo: PlazoDto,
  ) {
    return this.causas.renovar(admin, id, plazo.cierraEl, plazo.confirmo === true);
  }

  @Post(':id/archivar')
  @HttpCode(200)
  @ApiOkResponse({ type: CausaGestionDto })
  @ApiResponse(errores)
  archivar(@UsuarioActual() admin: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.causas.archivar(admin, id);
  }

  @Post(':id/reactivar')
  @HttpCode(200)
  @ApiOkResponse({ type: CausaGestionDto })
  @ApiResponse(errores)
  reactivar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() plazo: PlazoDto,
  ) {
    return this.causas.reactivar(admin, id, plazo.cierraEl, plazo.confirmo === true);
  }

  @Put(':id/imagen')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { imagen: { type: 'string', format: 'binary' } },
      required: ['imagen'],
    },
  })
  // Un byte más que el máximo: así procesarImagen responde 413 con su mensaje
  @UseInterceptors(FileInterceptor('imagen', { limits: { fileSize: TAMANO_MAXIMO + 1 } }))
  @ApiOkResponse({ type: CausaGestionDto })
  @ApiResponse(errores)
  subirImagen(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    if (!archivo) throw new ErrorDominio('SIN_ARCHIVO', 'Adjunta la imagen de la causa', 400);
    return this.causas.subirImagen(admin, id, archivo.buffer);
  }

  @Delete(':id/imagen')
  @ApiOkResponse({ type: CausaGestionDto })
  @ApiResponse(errores)
  quitarImagen(@UsuarioActual() admin: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.causas.quitarImagen(admin, id);
  }
}
