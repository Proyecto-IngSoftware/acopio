import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico } from '../../comun/autorizacion/decoradores';
import { PlataformaDto } from '../../comun/respuestas';
import { PlataformaDao } from './dao/plataforma.dao';

/** P14: otras plataformas que coordinan ayuda. No son causas: Acopio no las verifica. */
@ApiTags('importacion')
@Controller('publico/plataformas')
export class PlataformasController {
  constructor(private readonly plataformas: PlataformaDao) {}

  @Publico()
  @ApiOperation({
    summary: 'Otras plataformas de ayuda, en su orden. No exige sesión',
    security: [],
  })
  @Get()
  @ApiOkResponse({ type: PlataformaDto, isArray: true })
  async listar() {
    return (await this.plataformas.activas()).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      descripcion: p.descripcion,
      url: p.url,
    }));
  }
}
