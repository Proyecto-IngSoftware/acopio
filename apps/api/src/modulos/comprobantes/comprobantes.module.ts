import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { InventarioModule } from '../inventario/inventario.module';
import { ComprobantesController } from './comprobantes.controller';
import { ConciliacionService } from './conciliacion.service';
import { ComprobanteDao } from './dao/comprobante.dao';
import { DonacionesController } from './donaciones.controller';
import { DonacionesService } from './donaciones.service';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';
import { RecepcionService } from './recepcion.service';
import { SeguimientoController } from './seguimiento.controller';
import { SeguimientoService } from './seguimiento.service';
import { TareasCustodiaService } from './tareas-custodia.service';

/** Custodia de donaciones (Bloque 3). Usa inventario, catalogo, acopios, almacenamiento y notificaciones. */
@Module({
  imports: [InventarioModule, CatalogoModule],
  controllers: [
    DonacionesController,
    FacturasController,
    ComprobantesController,
    SeguimientoController,
  ],
  providers: [
    ComprobanteDao,
    DonacionesService,
    FacturasService,
    RecepcionService,
    ConciliacionService,
    SeguimientoService,
    TareasCustodiaService,
  ],
})
export class ComprobantesModule {}
