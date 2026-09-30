import { Module } from '@nestjs/common';
import { AcopiosController } from './acopios.controller';
import { AcopiosService } from './acopios.service';
import { EntidadesController } from './entidades.controller';
import { EntidadesService } from './entidades.service';

/** Red: entidades, acopios, zonas, ubicaciones y geocodificación (Bloque 1). */
@Module({
  controllers: [EntidadesController, AcopiosController],
  providers: [EntidadesService, AcopiosService],
  exports: [AcopiosService],
})
export class AcopiosModule {}
