import { Module } from '@nestjs/common';
import { DonacionesController } from './donaciones.controller';
import { DonacionesService } from './donaciones.service';

/** Custodia de donaciones (Bloque 3). Usa inventario, acopios, almacenamiento y notificaciones. */
@Module({
  controllers: [DonacionesController],
  providers: [DonacionesService],
})
export class ComprobantesModule {}
