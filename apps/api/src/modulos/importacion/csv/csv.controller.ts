import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, UsuarioActual } from '../../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../../comun/errores/error-dominio';
import { FormatoCsvDto, ReporteCsvDto } from '../../../comun/respuestas';
import { CsvService } from './csv.service';
import { MAXIMO_BYTES } from './leer-csv';
import { RegistroFormatos } from './registro-formatos';

const archivoCsv = FileInterceptor('archivo', { limits: { fileSize: MAXIMO_BYTES + 1 } });
const exigir = (archivo?: Express.Multer.File) => {
  if (!archivo) throw new ErrorDominio('SIN_ARCHIVO', 'Adjunta el archivo CSV', 400);
  return archivo.buffer;
};

/** Pieza E: carga de datos por CSV. Hoy la usan el script y la demo; mañana una pantalla. */
@ApiTags('importacion')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('importacion')
export class CsvController {
  constructor(
    private readonly csv: CsvService,
    private readonly registro: RegistroFormatos,
  ) {}

  @Get('formatos')
  @ApiOperation({ summary: 'Tipos de CSV que se pueden cargar, con sus columnas' })
  @ApiOkResponse({ type: FormatoCsvDto, isArray: true })
  formatos() {
    return this.registro
      .todos()
      .map((f) => ({ tipo: f.tipo, descripcion: f.descripcion, columnas: f.columnas }));
  }

  @Post('csv/:tipo/revisar')
  @HttpCode(200)
  @UseInterceptors(archivoCsv)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Revisa un CSV fila por fila, sin escribir nada' })
  @ApiOkResponse({ type: ReporteCsvDto })
  revisar(@Param('tipo') tipo: string, @UploadedFile() archivo?: Express.Multer.File) {
    return this.csv.revisar(tipo, exigir(archivo));
  }

  @Post('csv/:tipo/aplicar')
  @HttpCode(200)
  @UseInterceptors(archivoCsv)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Carga un CSV: todas las filas o ninguna (422 con el reporte)' })
  @ApiOkResponse({ type: ReporteCsvDto })
  aplicar(
    @Param('tipo') tipo: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.csv.aplicar(tipo, exigir(archivo), usuario);
  }
}
