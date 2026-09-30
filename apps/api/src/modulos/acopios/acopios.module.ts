import { Module } from '@nestjs/common';
import { EntidadesController } from './entidades.controller';
import { EntidadesService } from './entidades.service';

/** Red: entidades, acopios, zonas, ubicaciones y geocodificación (Bloque 1). */
@Module({
  controllers: [EntidadesController],
  providers: [EntidadesService],
})
export class AcopiosModule {}
