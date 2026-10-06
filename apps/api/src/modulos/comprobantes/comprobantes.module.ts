import { Module } from '@nestjs/common';
import { InventarioModule } from '../inventario/inventario.module';
import { ComprobantesController } from './comprobantes.controller';
import { DonacionesController } from './donaciones.controller';
import { DonacionesService } from './donaciones.service';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';
import { RecepcionService } from './recepcion.service';

/** Custodia de donaciones (Bloque 3). Usa inventario, acopios, almacenamiento y notificaciones. */
@Module({
  imports: [InventarioModule],
  controllers: [DonacionesController, FacturasController, ComprobantesController],
  providers: [DonacionesService, FacturasService, RecepcionService],
})
export class ComprobantesModule {}
