import { Global, Module } from '@nestjs/common';
import { CorreoSalienteDao } from './dao/correo-saliente.dao';
import { NotificacionService } from './notificacion.service';

/** Hoja del grafo de módulos: no depende de ningún módulo de dominio. */
@Global()
@Module({ providers: [NotificacionService, CorreoSalienteDao], exports: [NotificacionService] })
export class NotificacionesModule {}
