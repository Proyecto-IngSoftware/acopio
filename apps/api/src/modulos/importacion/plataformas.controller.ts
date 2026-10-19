import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico } from '../../comun/autorizacion/decoradores';
import { PlataformaDto } from '../../comun/respuestas';
import { PlataformasService } from './plataformas.service';

/** P14: otras plataformas que coordinan ayuda. No son causas: Acopio no las verifica. */
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
}
