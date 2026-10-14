import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { ComprobantesModule } from '../comprobantes/comprobantes.module';
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
import { RemisionesController } from './remisiones.controller';
import { RemisionesService } from './remisiones.service';
import { SugerenciasController } from './sugerencias.controller';
import { SugerenciasService } from './sugerencias.service';

/** Motor (Bloque 4): necesidad, excedentes, sugerencias y remisiones. Nadie lo importa. */
@Module({
  imports: [InventarioModule, CatalogoModule, ComprobantesModule],
  controllers: [
    NecesidadController,
    SugerenciasController,
    ConfiguracionController,
    RemisionesController,
  ],
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
    RemisionesService,
  ],
})
export class MotorModule {}
