import { Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ResultadoImportacionDto } from '../../comun/respuestas';
import { FUENTE_ACOPIOS, type FuenteAcopios } from './fuentes/fuente-acopios';
import { ImportadorReferenciadosService } from './importador-referenciados.service';

/** Pieza E: el Administrador trae ahora los puntos de RedAcopio, sin esperar la tarea. */
@ApiTags('importacion')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('importacion/fuentes')
export class ImportacionController {
  constructor(
    private readonly importador: ImportadorReferenciadosService,
    @Inject(FUENTE_ACOPIOS) private readonly fuente: FuenteAcopios,
  ) {}

  @Post('redacopio/ejecutar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Importa los puntos de RedAcopio desde la fuente configurada' })
  @ApiOkResponse({ type: ResultadoImportacionDto })
  ejecutar(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.importador.ejecutar(this.fuente, usuario.id);
  }
}
