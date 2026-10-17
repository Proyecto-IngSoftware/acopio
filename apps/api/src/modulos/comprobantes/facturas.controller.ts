import {
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
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
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { ComprobanteDto, ErrorDto } from '../../comun/respuestas';
import { TAMANO_MAXIMO } from '../almacenamiento/imagenes';
import { FacturasService } from './facturas.service';

const errores = { status: 'default' as const, type: ErrorDto, description: 'Error' };

@ApiTags('donaciones')
@ApiBearerAuth()
@Controller()
export class FacturasController {
  constructor(private readonly facturas: FacturasService) {}

  @Roles('DONADOR')
  @Post('donaciones/:folio/factura')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { factura: { type: 'string', format: 'binary' } },
      required: ['factura'],
    },
  })
  // Un byte más que el máximo: así procesarImagen responde 413 con su mensaje
  @UseInterceptors(FileInterceptor('factura', { limits: { fileSize: TAMANO_MAXIMO + 1 } }))
  @ApiOkResponse({ type: ComprobanteDto })
  @ApiResponse(errores)
  subir(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('folio') folio: string,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    if (!archivo) throw new ErrorDominio('SIN_ARCHIVO', 'Adjunta la foto de la factura', 400);
    return this.facturas.subir(u, folio, archivo.buffer);
  }

  @Roles('DONADOR', 'AUDITOR', 'ADMIN')
  @Get('comprobantes/:folio/factura')
  @Header('Cache-Control', 'private, no-store')
  @ApiProduces('image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiResponse(errores)
  async factura(@UsuarioActual() u: UsuarioAutenticado, @Param('folio') folio: string) {
    const { datos, tipo } = await this.facturas.leer(u, folio);
    return new StreamableFile(datos, { type: tipo });
  }
}
