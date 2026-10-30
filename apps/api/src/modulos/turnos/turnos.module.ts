import { Module } from '@nestjs/common';
import { CaptchaModule } from '../captcha/captcha.module';
import { AvisosTurnos } from './avisos-turnos';
import { JornadaDao } from './dao/jornada.dao';
import { ReservaDao } from './dao/reserva.dao';
import { GestionController, ReservasGestionController } from './gestion.controller';
import { JornadasService } from './jornadas.service';
import { PublicoController } from './publico.controller';
import { ReservasService } from './reservas.service';
import { TareasTurnosService } from './tareas-turnos.service';

/** Turnos de voluntariado (Bloque 5): jornadas, reservas sin cuenta y aforo. Nadie lo importa. */
@Module({
  imports: [CaptchaModule],
  controllers: [GestionController, ReservasGestionController, PublicoController],
  providers: [
    JornadaDao,
    ReservaDao,
    AvisosTurnos,
    JornadasService,
    ReservasService,
    TareasTurnosService,
  ],
  exports: [JornadasService],
})
export class TurnosModule {}
