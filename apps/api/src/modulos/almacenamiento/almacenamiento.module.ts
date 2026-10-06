import { Global, Module } from '@nestjs/common';
import { ALMACEN } from './almacen';
import { AlmacenS3 } from './almacen-s3';
import { AlmacenamientoService } from './almacenamiento.service';

/** Garage (ADR-0012). Hoja del grafo: no depende de ningún módulo de dominio. */
@Global()
@Module({
  providers: [AlmacenS3, { provide: ALMACEN, useExisting: AlmacenS3 }, AlmacenamientoService],
  exports: [AlmacenamientoService],
})
export class AlmacenamientoModule {}
