import { Controller, Get, Header, Param, ParseUUIDPipe, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Publico } from '../../comun/autorizacion/decoradores';
import { PlataformaDto } from '../../comun/respuestas';
import { PlataformasService } from './plataformas.service';

/** Otras plataformas que coordinan ayuda, al final de Causas (P3). Acopio no las verifica. */
@ApiTags('importacion')
@Controller('publico/plataformas')
export class PlataformasController {
  constructor(private readonly plataformas: PlataformasService) {}

  @Publico()
  @ApiOperation({
    summary: 'Otras plataformas de ayuda, en su orden. No exige sesión',
    security: [],
  })
  @Get()
  @ApiOkResponse({ type: PlataformaDto, isArray: true })
  listar() {
    return this.plataformas.listar();
  }

  @Publico()
  @ApiOperation({ summary: 'La imagen de una plataforma, en WebP. No exige sesión', security: [] })
  @Get(':id/imagen')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'La imagen de la plataforma, en WebP' })
  async imagen(@Param('id', ParseUUIDPipe) id: string) {
    const { datos, tipo } = await this.plataformas.leerImagen(id);
    return new StreamableFile(datos, { type: tipo });
  }
}
