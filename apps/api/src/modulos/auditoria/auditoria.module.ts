import { Global, Module } from '@nestjs/common';
import { BitacoraController } from './bitacora.controller';
import { BitacoraService } from './bitacora.service';

@Global()
@Module({
  controllers: [BitacoraController],
  providers: [BitacoraService],
  exports: [BitacoraService],
})
export class AuditoriaModule {}
