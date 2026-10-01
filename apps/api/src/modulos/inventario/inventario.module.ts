import { Module } from '@nestjs/common';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { NoRecibirController } from './no-recibir.controller';
import { NoRecibirService } from './no-recibir.service';

/** Inventario: «no recibir» (Bloque 1) y movimientos, saldos y umbrales (Bloque 2). */
@Module({
  controllers: [NoRecibirController, MovimientosController],
  providers: [NoRecibirService, MovimientosService],
})
export class InventarioModule {}
