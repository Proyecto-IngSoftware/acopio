import { Module } from '@nestjs/common';
import { NoRecibirController } from './no-recibir.controller';
import { NoRecibirService } from './no-recibir.service';

/** Inventario. En el Bloque 1 solo «no recibir» (B-02); el resto llega en el Bloque 2. */
@Module({
  controllers: [NoRecibirController],
  providers: [NoRecibirService],
})
export class InventarioModule {}
