import { Module } from '@nestjs/common';
import { ENTORNO, type Entorno } from '../../config/entorno';
import { EjecucionDao } from './dao/ejecucion.dao';
import { PlataformaDao } from './dao/plataforma.dao';
import { FUENTE_ACOPIOS } from './fuentes/fuente-acopios';
import { RedAcopioArchivo } from './fuentes/redacopio/redacopio-archivo';
import { RedAcopioHttp } from './fuentes/redacopio/redacopio-http';
import { ImportacionController } from './importacion.controller';
import { PlataformasController } from './plataformas.controller';
import { ImportadorReferenciadosService } from './importador-referenciados.service';
import { TareaImportacionService } from './tarea-importacion.service';

/**
 * Pieza E. Lee fuentes externas de acopios y carga datos por CSV. Está en la punta del grafo:
 * importa los módulos cuyos datos escribe y nadie la importa a ella.
 */
@Module({
  controllers: [ImportacionController, PlataformasController],
  providers: [
    ImportadorReferenciadosService,
    TareaImportacionService,
    PlataformaDao,
    EjecucionDao,
    {
      provide: FUENTE_ACOPIOS,
      inject: [ENTORNO],
      useFactory: (e: Entorno) =>
        e.IMPORTACION_ORIGEN === 'http' ? new RedAcopioHttp() : new RedAcopioArchivo(),
    },
  ],
})
export class ImportacionModule {}
