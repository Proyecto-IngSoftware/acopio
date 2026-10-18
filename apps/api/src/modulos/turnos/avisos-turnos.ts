import { Inject, Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { ENTORNO, type Entorno } from '../../config/entorno';
import { NotificacionService } from '../notificaciones/notificacion.service';
import { plantillas } from '../notificaciones/plantillas';
import type { FilaJornada } from './turnos.vistas';

interface Destinatario {
  nombre: string | null;
  correo: string | null;
}

/**
 * Correos de turnos, siempre en la transacción de la operación. Con el correo apagado
 * (P-055) `encolar` no hace nada y P8 muestra lo que el correo traería (T-05).
 */
@Injectable()
export class AvisosTurnos {
  constructor(
    private readonly notificaciones: NotificacionService,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  /** El único correo con el secreto: no se guarda, así que los demás no pueden traerlo. */
  confirmada(tx: ClienteBd, r: Destinatario & { codigo: string }, j: FilaJornada, secreto: string) {
    return this.enviar(tx, r, (nombre) =>
      plantillas.reservaConfirmada({
        nombre,
        titulo: j.titulo,
        lugar: textoLugar(j),
        inicio: j.inicio,
        queLlevar: j.que_llevar,
        codigo: r.codigo,
        enlace: `${this.entorno.APP_URL}/voluntariado/reserva/${r.codigo}#${secreto}`,
      }),
    );
  }

  cancelada(tx: ClienteBd, r: Destinatario, j: FilaJornada) {
    return this.enviar(tx, r, (nombre) =>
      plantillas.reservaCancelada({ nombre, titulo: j.titulo, inicio: j.inicio }),
    );
  }

  async cambiada(tx: ClienteBd, reservas: Destinatario[], j: FilaJornada) {
    for (const r of reservas) {
      await this.enviar(tx, r, (nombre) =>
        plantillas.jornadaCambiada({
          nombre,
          titulo: j.titulo,
          lugar: textoLugar(j),
          inicio: j.inicio,
          enlaceJornada: this.enlaceJornada(j),
        }),
      );
    }
  }

  async jornadaCancelada(tx: ClienteBd, reservas: Destinatario[], j: FilaJornada) {
    for (const r of reservas) {
      await this.enviar(tx, r, (nombre) =>
        plantillas.jornadaCancelada({
          nombre,
          titulo: j.titulo,
          inicio: j.inicio,
          motivo: j.motivo_cancelacion ?? '',
        }),
      );
    }
  }

  recordatorio(tx: ClienteBd, r: Destinatario, j: FilaJornada) {
    return this.enviar(tx, r, (nombre) =>
      plantillas.recordatorioJornada({
        nombre,
        titulo: j.titulo,
        lugar: textoLugar(j),
        inicio: j.inicio,
        queLlevar: j.que_llevar,
        enlaceJornada: this.enlaceJornada(j),
      }),
    );
  }

  private enlaceJornada(j: FilaJornada) {
    return `${this.entorno.APP_URL}/voluntariado/${j.id}`;
  }

  /** Una reserva con los datos ya borrados no recibe nada. */
  private async enviar(
    tx: ClienteBd,
    r: Destinatario,
    redactar: (nombre: string) => ReturnType<typeof plantillas.reservaCancelada>,
  ) {
    if (!r.correo) return;
    await this.notificaciones.encolar(tx, r.correo, redactar(r.nombre ?? ''));
  }
}

export function textoLugar(j: FilaJornada): string {
  const lugar = j.acopio
    ? [j.acopio.nombre, j.acopio.direccion, j.acopio.municipio]
    : [j.entidad?.nombre, j.direccion, j.municipio];
  return lugar.filter(Boolean).join(', ');
}
