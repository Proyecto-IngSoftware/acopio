import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { CATEGORIAS_CAUSA } from '@acopio/shared';
import { z } from 'zod';
import { Publico } from '../../comun/autorizacion/decoradores';
import { crearDto } from '../../comun/dto';
import { CausaPublicaDto } from '../../comun/respuestas';
import { CausasService } from './causas.service';

class FiltroCategoriaDto extends crearDto(
  z.object({ categoria: z.enum(CATEGORIAS_CAUSA).optional() }),
) {}

/** P3 y P4: directorio, causas atendidas y ficha, para cualquiera (RF-RED-008). */
@ApiTags('causas')
@Publico()
@Controller('causas')
export class CausasPublicasController {
  constructor(private readonly causas: CausasService) {}

  @Get()
  @ApiOkResponse({ type: CausaPublicaDto, isArray: true })
  listar(@Query() filtro: FiltroCategoriaDto) {
    return this.causas.listarPublicas(filtro.categoria);
  }

  @Get('atendidas')
  @ApiOkResponse({ type: CausaPublicaDto, isArray: true })
  atendidas(@Query() filtro: FiltroCategoriaDto) {
    return this.causas.listarAtendidas(filtro.categoria);
  }

  @Get(':id')
  @ApiOkResponse({ type: CausaPublicaDto })
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.causas.obtenerPublica(id);
  }

  @Get(':id/imagen')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'La imagen de la causa, en WebP' })
  async imagen(@Param('id', ParseUUIDPipe) id: string) {
    const { datos, tipo } = await this.causas.leerImagen(id);
    return new StreamableFile(datos, { type: tipo });
  }
}
