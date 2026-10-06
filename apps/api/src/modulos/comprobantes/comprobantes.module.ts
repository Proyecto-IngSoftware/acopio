import { Module } from '@nestjs/common';
import { DonacionesController } from './donaciones.controller';
import { DonacionesService } from './donaciones.service';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';

/** Custodia de donaciones (Bloque 3). Usa inventario, acopios, almacenamiento y notificaciones. */
@Module({
  controllers: [DonacionesController, FacturasController],
  providers: [DonacionesService, FacturasService],
})
export class ComprobantesModule {}
