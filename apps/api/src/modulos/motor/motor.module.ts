import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { InventarioModule } from '../inventario/inventario.module';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';
import { ConfiguracionDao } from './dao/configuracion.dao';
import { NecesidadDao } from './dao/necesidad.dao';
import { RemisionDao } from './dao/remision.dao';
import { SugerenciaDao } from './dao/sugerencia.dao';
import { EstadoMotorService } from './estado-motor.service';
import { NecesidadController } from './necesidad.controller';
import { NecesidadService } from './necesidad.service';
import { RemisionesBorradorService } from './remisiones-borrador.service';
import { SugerenciasController } from './sugerencias.controller';
import { SugerenciasService } from './sugerencias.service';

/** Motor (Bloque 4): necesidad, excedentes, sugerencias y remisiones. Nadie lo importa. */
@Module({
  imports: [InventarioModule, CatalogoModule],
  controllers: [NecesidadController, SugerenciasController, ConfiguracionController],
  providers: [
    ConfiguracionDao,
    NecesidadDao,
    RemisionDao,
    SugerenciaDao,
    EstadoMotorService,
    NecesidadService,
    SugerenciasService,
    ConfiguracionService,
    RemisionesBorradorService,
  ],
})
export class MotorModule {}
