import { Controller, Get, Header, Param, ParseUUIDPipe, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Publico } from '../../comun/autorizacion/decoradores';
import { EntidadesService } from './entidades.service';

/** El logotipo de una entidad, para P3 y P4. Aparte porque C15 es solo del Administrador. */
@ApiTags('red')
@Controller('entidades')
export class LogosController {
  constructor(private readonly entidades: EntidadesService) {}

  @Publico()
  @Get(':id/logo')
  // Sin max-age: un logotipo reemplazado o de una entidad que perdió la verificación no se queda
  // en el navegador, y la URL pública no lleva versión
  @Header('Cache-Control', 'public, no-cache')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'La imagen del logotipo, en WebP' })
  async leer(@Param('id', ParseUUIDPipe) id: string) {
    const { datos, tipo } = await this.entidades.leerLogo(id);
    return new StreamableFile(datos, { type: tipo });
  }
}
