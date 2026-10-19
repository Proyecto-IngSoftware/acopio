import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ENTORNO, type Entorno } from '../../config/entorno';
import { FUENTE_ACOPIOS, type FuenteAcopios } from './fuentes/fuente-acopios';
import { ImportadorReferenciadosService } from './importador-referenciados.service';

/** Lectura cada 60 minutos (P-022). Apagada mientras `IMPORTACION_PROGRAMADA` no sea true. */
@Injectable()
export class TareaImportacionService {
  private readonly registro = new Logger(TareaImportacionService.name);

  constructor(
    private readonly importador: ImportadorReferenciadosService,
    @Inject(FUENTE_ACOPIOS) private readonly fuente: FuenteAcopios,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  @Cron('0 * * * *', { name: 'importar-redacopio', timeZone: 'America/Bogota' })
  async importar() {
    if (!this.entorno.IMPORTACION_PROGRAMADA) return;
    const r = await this.importador.ejecutar(this.fuente, null);
    this.registro.log(`RedAcopio: ${JSON.stringify(r)}`);
  }
}
