import { Global, Module } from '@nestjs/common';
import { AcopioDao } from './dao/acopio.dao';
import { CausaDao } from './dao/causa.dao';
import { EntidadDao } from './dao/entidad.dao';
import { ZonaDao } from './dao/zona.dao';
import { VERIFICADOR_UBICACIONES } from '../../comun/ubicaciones/verificador-ubicaciones';
import { AcopiosController } from './acopios.controller';
import { AcopiosService } from './acopios.service';
import { CausasController } from './causas.controller';
import { CausasService } from './causas.service';
import { EntidadesController } from './entidades.controller';
import { EntidadesService } from './entidades.service';
import { GeocodificacionController } from './geocodificacion.controller';
import { LogosController } from './logos.controller';
import {
  GEOCODIFICADOR,
  GeocodificacionService,
  GeocodificadorNominatim,
  RELOJ,
  relojReal,
} from './geocodificacion';
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
  controllers: [
    EntidadesController,
    LogosController,
    CausasController,
    AcopiosController,
    ZonasController,
    UbicacionesController,
    GeocodificacionController,
  ],
  providers: [
    AcopioDao,
    CausaDao,
    EntidadDao,
    ZonaDao,
    EntidadesService,
    CausasService,
    AcopiosService,
    ZonasService,
    UbicacionesService,
    { provide: VERIFICADOR_UBICACIONES, useExisting: UbicacionesService },
    GeocodificacionService,
    GeocodificadorNominatim,
    { provide: GEOCODIFICADOR, useExisting: GeocodificadorNominatim },
    { provide: RELOJ, useValue: relojReal },
  ],
  exports: [AcopioDao, ZonaDao, AcopiosService, VERIFICADOR_UBICACIONES],
})
export class AcopiosModule {}
