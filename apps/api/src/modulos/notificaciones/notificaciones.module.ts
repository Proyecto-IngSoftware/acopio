import { Global, Module } from '@nestjs/common';
import { NotificacionService } from './notificacion.service';

/** Hoja del grafo de módulos: no depende de ningún módulo de dominio. */
@Global()
@Module({ providers: [NotificacionService], exports: [NotificacionService] })
export class NotificacionesModule {}
