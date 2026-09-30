import { Module } from '@nestjs/common';
import { AcopiosController } from './acopios.controller';
import { AcopiosService } from './acopios.service';
import { EntidadesController } from './entidades.controller';
import { EntidadesService } from './entidades.service';
import { ZonasController } from './zonas.controller';
import { ZonasService } from './zonas.service';

/** Red: entidades, acopios, zonas, ubicaciones y geocodificación (Bloque 1). */
@Module({
  controllers: [EntidadesController, AcopiosController, ZonasController],
  providers: [EntidadesService, AcopiosService, ZonasService],
  exports: [AcopiosService],
})
export class AcopiosModule {}
