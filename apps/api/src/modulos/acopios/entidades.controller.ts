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
import { crearDto } from '../../comun/dto';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { EntidadDto, ErrorDto } from '../../comun/respuestas';
import { TAMANO_MAXIMO } from '../almacenamiento/imagenes';
import { EntidadesService } from './entidades.service';

const opcional = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

class CrearEntidadDto extends crearDto(
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
class ActualizarEntidadDto extends crearDto(CrearEntidadDto.schema.partial()) {}
class VerificarEntidadDto extends crearDto(
  z.object({
    confirmo: z
      .boolean()
      .optional()
      .describe('Confirmo que revisé la entidad y su sitio oficial (aviso de seguridad, C-09)'),
  }),
) {}
class ArchivadasDto extends crearDto(z.object({ archivadas: z.number().int() })) {}

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

  @Post(':id/verificar')
  @HttpCode(200)
  @ApiOkResponse({ type: EntidadDto })
  @ApiResponse(errores)
  verificar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cuerpo: VerificarEntidadDto,
  ) {
    return this.entidades.verificar(admin, id, cuerpo.confirmo === true);
  }

  @Post(':id/quitar-verificacion')
  @HttpCode(200)
  @ApiOkResponse({ type: ArchivadasDto })
  @ApiResponse(errores)
  quitarVerificacion(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.entidades.quitarVerificacion(admin, id);
  }

  @Put(':id/logo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { logo: { type: 'string', format: 'binary' } },
      required: ['logo'],
    },
  })
  // Un byte más que el máximo: así procesarImagen responde 413 con su mensaje
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: TAMANO_MAXIMO + 1 } }))
  @ApiOkResponse({ type: EntidadDto })
  @ApiResponse(errores)
  subirLogo(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    if (!archivo) throw new ErrorDominio('SIN_ARCHIVO', 'Adjunta la imagen del logotipo', 400);
    return this.entidades.subirLogo(admin, id, archivo.buffer);
  }

  @Delete(':id/logo')
  @ApiOkResponse({ type: EntidadDto })
  @ApiResponse(errores)
  quitarLogo(@UsuarioActual() admin: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.entidades.quitarLogo(admin, id);
  }
}
