import { Module } from '@nestjs/common';
import { ConsultasController } from './consultas.controller';
import { ConsultasService } from './consultas.service';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { NoRecibirController } from './no-recibir.controller';
import { NoRecibirService } from './no-recibir.service';
import { UmbralesController } from './umbrales.controller';
import { UmbralesService } from './umbrales.service';

/** Inventario: «no recibir» (Bloque 1) y movimientos, saldos y umbrales (Bloque 2). */
@Module({
  controllers: [
    NoRecibirController,
    MovimientosController,
    ConsultasController,
    UmbralesController,
  ],
  providers: [NoRecibirService, MovimientosService, ConsultasService, UmbralesService],
})
export class InventarioModule {}
