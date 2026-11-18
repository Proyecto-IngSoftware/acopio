import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createTransport, type Transporter } from 'nodemailer';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { ENTORNO, type Entorno } from '../../config/entorno';
import { CorreoSalienteDao, type CorreoReclamado } from './dao/correo-saliente.dao';
import type { CorreoRedactado } from './plantillas';

/** Después de este número de intentos el correo queda FALLIDO sin más reintentos. */
export const MAX_INTENTOS = 8;

/** Cuánto tiempo queda tomado un lote: si la instancia se cae enviándolo, vuelve a la cola. */
export const PRESTAMO_MS = 5 * 60_000;

/** Espera antes del siguiente intento: 1, 2, 4, 8… minutos, hasta 2 horas. */
export function esperaTrasIntento(intentos: number): number {
  return Math.min(2 ** Math.max(intentos - 1, 0), 120) * 60_000;
}

/**
 * Correo por SMTP estándar, sin SDK de proveedor (ADR-0008): cambiar de servidor es
 * cambiar variables. Todo correo pasa por la cola `correo_saliente`, así un SMTP
 * caído no hace fallar la operación que lo pidió, y se reintenta solo.
 *
 * Con CORREO_ACTIVO=false (P-055) no se encola ni se envía nada: las invitaciones y los
 * restablecimientos se comparten con el enlace que muestra la consola.
 */
@Injectable()
export class NotificacionService implements OnApplicationBootstrap {
  private readonly log = new Logger(NotificacionService.name);
  private readonly transporte?: Transporter;
  private procesando = false;

  constructor(
    private readonly cola: CorreoSalienteDao,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {
    if (!entorno.CORREO_ACTIVO) return;
    this.transporte = createTransport({
      host: entorno.SMTP_HOST,
      port: entorno.SMTP_PORT,
      secure: entorno.SMTP_SEGURO,
      auth: entorno.SMTP_USER
        ? { user: entorno.SMTP_USER, pass: entorno.SMTP_PASSWORD ?? '' }
        : undefined,
    });
  }

  onApplicationBootstrap() {
    if (!this.entorno.CORREO_ACTIVO) {
      this.log.warn('Correo apagado (CORREO_ACTIVO=false): no se encola ni se envía ningún correo');
    }
  }

  /**
   * Encola un correo en la misma transacción que la operación que lo origina. Con el
   * correo apagado no guarda nada y devuelve null.
   */
  async encolar(cliente: ClienteBd, destinatario: string, correo: CorreoRedactado) {
    if (!this.entorno.CORREO_ACTIVO) return null;
    return this.cola.crear(cliente, { destinatario, ...correo });
  }

  /** Cada minuto: envía lo pendiente y reintenta lo fallido cuyo turno ya llegó. */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'enviar-correos' })
  async procesarCola(): Promise<{ enviados: number; fallidos: number }> {
    const transporte = this.transporte;
    if (!this.entorno.CORREO_ACTIVO || !transporte || this.procesando) {
      return { enviados: 0, fallidos: 0 };
    }
    this.procesando = true;
    try {
      const lote = await this.cola.reclamar(MAX_INTENTOS, 50, PRESTAMO_MS);
      let enviados = 0;
      let fallidos = 0;
      for (const correo of lote) {
        const resultado = await this.enviar(transporte, correo);
        if (resultado === 'ENVIADO') enviados++;
        if (resultado === 'FALLIDO') fallidos++;
      }
      return { enviados, fallidos };
    } finally {
      this.procesando = false;
    }
  }

  private async enviar(
    transporte: Transporter,
    correo: CorreoReclamado,
  ): Promise<'ENVIADO' | 'FALLIDO' | 'VENCIDO'> {
    if (!(await this.cola.renovar(correo, PRESTAMO_MS))) return 'VENCIDO';
    const renovacion = setInterval(() => {
      void this.cola.renovar(correo, PRESTAMO_MS).catch((error: unknown) => {
        const mensaje = error instanceof Error ? error.message : String(error);
        this.log.warn(`No se pudo renovar el préstamo de ${correo.id}: ${mensaje}`);
      });
    }, PRESTAMO_MS / 3);
    renovacion.unref();
    const intentos = correo.intentos + 1;
    try {
      await transporte.sendMail({
        from: this.entorno.CORREO_REMITENTE,
        to: correo.destinatario,
        subject: correo.asunto,
        text: correo.cuerpo_texto,
        html: correo.cuerpo_html ?? undefined,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.log.warn(`No se pudo enviar el correo ${correo.id} (intento ${intentos}): ${mensaje}`);
      const { count } = await this.cola.marcarFallido(
        correo,
        intentos,
        mensaje.slice(0, 500),
        new Date(Date.now() + esperaTrasIntento(intentos)),
      );
      return count === 1 ? 'FALLIDO' : 'VENCIDO';
    } finally {
      clearInterval(renovacion);
    }
    const { count } = await this.cola.marcarEnviado(correo, intentos);
    return count === 1 ? 'ENVIADO' : 'VENCIDO';
  }
}
