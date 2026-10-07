import { Module } from '@nestjs/common';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';
import { EstadoMotorService } from './estado-motor.service';
import { NecesidadController } from './necesidad.controller';
import { NecesidadService } from './necesidad.service';
import { SugerenciasController } from './sugerencias.controller';
import { SugerenciasService } from './sugerencias.service';

/** Motor (Bloque 4): necesidad, excedentes, sugerencias y remisiones. Nadie lo importa. */
@Module({
  controllers: [NecesidadController, SugerenciasController, ConfiguracionController],
  providers: [EstadoMotorService, NecesidadService, SugerenciasService, ConfiguracionService],
})
export class MotorModule {}
