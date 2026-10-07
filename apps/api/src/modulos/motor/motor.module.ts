import { Module } from '@nestjs/common';
import { EstadoMotorService } from './estado-motor.service';
import { NecesidadController } from './necesidad.controller';
import { NecesidadService } from './necesidad.service';
import { SugerenciasController } from './sugerencias.controller';
import { SugerenciasService } from './sugerencias.service';

/** Motor (Bloque 4): necesidad, excedentes, sugerencias y remisiones. Nadie lo importa. */
@Module({
  controllers: [NecesidadController, SugerenciasController],
  providers: [EstadoMotorService, NecesidadService, SugerenciasService],
})
export class MotorModule {}
