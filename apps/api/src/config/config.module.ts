import { Global, Module } from '@nestjs/common';
import { ENTORNO, leerEntorno } from './entorno';

@Global()
@Module({
  providers: [{ provide: ENTORNO, useFactory: () => leerEntorno() }],
  exports: [ENTORNO],
})
export class ConfigModule {}
