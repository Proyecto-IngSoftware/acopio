import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { FiltroErrores } from './comun/errores/filtro-errores';
import { LimiteIntentosGuard } from './comun/limite-intentos.guard';
import { PrismaModule } from './comun/prisma/prisma.module';
import { ConfigModule } from './config/config.module';
import { AuditoriaModule } from './modulos/auditoria/auditoria.module';
import { CatalogoModule } from './modulos/catalogo/catalogo.module';
import { AutenticacionGuard } from './modulos/identidad/autenticacion/autenticacion.guard';
import { IdentidadModule } from './modulos/identidad/identidad.module';
import { NotificacionesModule } from './modulos/notificaciones/notificaciones.module';
import { SaludModule } from './modulos/salud/salud.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    // Límite general por IP; los endpoints sensibles ponen uno más estricto
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    AuditoriaModule,
    NotificacionesModule,
    IdentidadModule,
    CatalogoModule,
    SaludModule,
  ],
  providers: [
    // Orden de los guards: primero el límite de intentos, después la sesión
    LimiteIntentosGuard,
    { provide: APP_GUARD, useExisting: LimiteIntentosGuard },
    { provide: APP_GUARD, useExisting: AutenticacionGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: FiltroErrores },
  ],
})
export class AppModule {}
