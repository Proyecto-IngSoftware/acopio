import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LIMITES_TURNOS } from '@acopio/shared';
import { Transacciones } from '../../comun/prisma/transacciones';
import { RELOJ, type Reloj } from '../acopios/geocodificacion';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AvisosTurnos } from './avisos-turnos';
import { ReservaDao } from './dao/reserva.dao';

const MS_HORA = 3_600_000;

/** Tareas programadas de turnos (vista general, «Tareas programadas»). */
@Injectable()
export class TareasTurnosService {
  private readonly log = new Logger(TareasTurnosService.name);

  constructor(
    private readonly reservas: ReservaDao,
    private readonly transacciones: Transacciones,
    private readonly avisos: AvisosTurnos,
    private readonly bitacora: BitacoraService,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  /**
   * RF-TUR-004: el recordatorio de 24 horas. Se marca aunque el correo esté apagado, para que
   * no salga tarde y de golpe cuando se encienda.
   */
  @Cron('*/15 * * * *', { name: 'recordar-reservas', timeZone: 'America/Bogota' })
  async recordarReservas(ahora = new Date(this.reloj.ahora())): Promise<number> {
    const pendientes = await this.reservas.porRecordar(
      ahora,
      new Date(ahora.getTime() + 24 * MS_HORA),
    );
    for (const r of pendientes) {
      await this.transacciones.ejecutar(async (tx) => {
        await this.avisos.recordatorio(tx, r, r.jornada);
        await this.reservas.actualizar(r.id, { recordatorio_en: ahora }, tx);
      });
    }
    if (pendientes.length > 0) this.log.log(`Recordatorios encolados: ${pendientes.length}`);
    return pendientes.length;
  }

  /** T-06: los datos personales de una reserva duran 30 días después de su jornada. */
  @Cron('20 0 * * *', { name: 'borrar-datos-reservas', timeZone: 'America/Bogota' })
  async borrarDatosVencidos(ahora = new Date(this.reloj.ahora())): Promise<number> {
    const limite = new Date(ahora.getTime() - LIMITES_TURNOS.diasBorrado * 24 * MS_HORA);
    return this.transacciones.ejecutar(async (tx) => {
      const cantidad = await this.reservas.borrarDatos(limite, ahora, tx);
      if (cantidad > 0) {
        await this.bitacora.registrar(tx, {
          usuarioId: null,
          accion: 'reservas.datos_borrados',
          entidad: 'reserva',
          despues: { cantidad, jornadasTerminadasAntesDe: limite.toISOString() },
        });
      }
      return cantidad;
    });
  }
}
