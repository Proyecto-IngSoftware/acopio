import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createTransport, type Transporter } from 'nodemailer';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { ENTORNO, type Entorno } from '../../config/entorno';
import { CorreoSalienteDao } from './dao/correo-saliente.dao';
import type { CorreoRedactado } from './plantillas';

/** Después de este número de intentos el correo queda FALLIDO sin más reintentos. */
export const MAX_INTENTOS = 8;

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
      const lote = await this.cola.listos(MAX_INTENTOS, 50);
      let enviados = 0;
      for (const correo of lote) {
        if (await this.enviar(transporte, correo)) enviados++;
      }
      return { enviados, fallidos: lote.length - enviados };
    } finally {
      this.procesando = false;
    }
  }

  private async enviar(
    transporte: Transporter,
    correo: {
      id: string;
      destinatario: string;
      asunto: string;
      cuerpo_texto: string;
      cuerpo_html: string | null;
      intentos: number;
    },
  ): Promise<boolean> {
    const intentos = correo.intentos + 1;
    try {
      await transporte.sendMail({
        from: this.entorno.CORREO_REMITENTE,
        to: correo.destinatario,
        subject: correo.asunto,
        text: correo.cuerpo_texto,
        html: correo.cuerpo_html ?? undefined,
      });
      await this.cola.marcarEnviado(correo.id, intentos);
      return true;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.log.warn(`No se pudo enviar el correo ${correo.id} (intento ${intentos}): ${mensaje}`);
      await this.cola.marcarFallido(
        correo.id,
        intentos,
        mensaje.slice(0, 500),
        new Date(Date.now() + esperaTrasIntento(intentos)),
      );
      return false;
    }
  }
}
