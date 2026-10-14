import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { ErrorDto, RemisionDto } from '../../comun/respuestas';
import { TAMANO_MAXIMO } from '../almacenamiento/imagenes';
import { RecepcionesService } from './recepciones.service';

class RecibirRemisionDto extends createZodDto(
  z.object({
    zonaId: z.uuid().optional().describe('Solo en un despacho general: una zona del Receptor'),
    nota: z.string().trim().max(280).optional(),
  }),
) {}

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

/** C13 Recepción en zona (RF-MOT-009) y la evidencia de cada remisión (ADR-0017). */
@ApiTags('recepciones')
@ApiBearerAuth()
@Controller()
export class RecepcionesController {
  constructor(private readonly recepciones: RecepcionesService) {}

  @Roles('RECEPTOR', 'ADMIN')
  @Get('recepciones')
  @ApiOkResponse({ type: RemisionDto, isArray: true })
  pendientes(@UsuarioActual() u: UsuarioAutenticado) {
    return this.recepciones.pendientes(u);
  }

  @Roles('RECEPTOR', 'ADMIN')
  @Get('recepciones/qr/:token')
  @ApiOkResponse({ type: RemisionDto })
  @ApiResponse(errores)
  porQr(@UsuarioActual() u: UsuarioAutenticado, @Param('token') token: string) {
    return this.recepciones.porQr(u, token);
  }

  @Roles('RECEPTOR')
  @Post('remisiones/:codigo/evidencia')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { foto: { type: 'string', format: 'binary' } },
      required: ['foto'],
    },
  })
  // Un byte más que el máximo: así procesarImagen responde 413 con su mensaje
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: TAMANO_MAXIMO + 1 } }))
  @ApiOkResponse({ type: RemisionDto })
  @ApiResponse(errores)
  subirEvidencia(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('codigo') codigo: string,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    if (!archivo) throw new ErrorDominio('SIN_ARCHIVO', 'Adjunta la foto de lo que llegó', 400);
    return this.recepciones.subirEvidencia(u, codigo, archivo.buffer);
  }

  @Roles('ADMIN', 'AUDITOR', 'OPERADOR', 'RECEPTOR')
  @Get('remisiones/:codigo/evidencia/:n')
  @Header('Cache-Control', 'private, no-store')
  @ApiProduces('image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiResponse(errores)
  async evidencia(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('codigo') codigo: string,
    @Param('n', ParseIntPipe) n: number,
  ) {
    const { datos, tipo } = await this.recepciones.evidencia(u, codigo, n);
    return new StreamableFile(datos, { type: tipo });
  }

  @Roles('RECEPTOR')
  @Post('remisiones/:codigo/recibir')
  @HttpCode(200)
  @ApiOkResponse({ type: RemisionDto })
  @ApiResponse(errores)
  recibir(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('codigo') codigo: string,
    @Body() d: RecibirRemisionDto,
  ) {
    return this.recepciones.recibir(u, codigo, d);
  }
}
