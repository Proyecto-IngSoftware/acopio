import { Module } from '@nestjs/common';
import { CatalogoModule } from '../catalogo/catalogo.module';
import { ConsultasController } from './consultas.controller';
import { ConsultasService } from './consultas.service';
import { MovimientoDao } from './dao/movimiento.dao';
import { NoRecibirDao } from './dao/no-recibir.dao';
import { SaldoDao } from './dao/saldo.dao';
import { UmbralDao } from './dao/umbral.dao';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';
import { NoRecibirController } from './no-recibir.controller';
import { NoRecibirService } from './no-recibir.service';
import { UmbralesController } from './umbrales.controller';
import { UmbralesService } from './umbrales.service';

/** Inventario: «no recibir» (Bloque 1) y movimientos, saldos y umbrales (Bloque 2). */
@Module({
  imports: [CatalogoModule],
  controllers: [
    NoRecibirController,
    MovimientosController,
    ConsultasController,
    UmbralesController,
  ],
  providers: [
    MovimientoDao,
    SaldoDao,
    UmbralDao,
    NoRecibirDao,
    NoRecibirService,
    MovimientosService,
    ConsultasService,
    UmbralesService,
  ],
  exports: [MovimientosService, MovimientoDao, SaldoDao, NoRecibirDao, UmbralDao],
})
export class InventarioModule {}
