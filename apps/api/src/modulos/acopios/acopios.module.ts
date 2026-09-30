import { Global, Module } from '@nestjs/common';
import { VERIFICADOR_UBICACIONES } from '../../comun/ubicaciones/verificador-ubicaciones';
import { AcopiosController } from './acopios.controller';
import { AcopiosService } from './acopios.service';
import { EntidadesController } from './entidades.controller';
import { EntidadesService } from './entidades.service';
import { UbicacionesController } from './ubicaciones.controller';
import { UbicacionesService } from './ubicaciones.service';
import { ZonasController } from './zonas.controller';
import { ZonasService } from './zonas.service';

/**
 * Red: entidades, acopios, zonas, ubicaciones y geocodificación (Bloque 1). Es global
 * para que `identidad` reciba el VerificadorUbicaciones sin importar este módulo (B-05).
 */
@Global()
@Module({
  controllers: [EntidadesController, AcopiosController, ZonasController, UbicacionesController],
  providers: [
    EntidadesService,
    AcopiosService,
    ZonasService,
    UbicacionesService,
    { provide: VERIFICADOR_UBICACIONES, useExisting: UbicacionesService },
  ],
  exports: [AcopiosService, VERIFICADOR_UBICACIONES],
})
export class AcopiosModule {}
