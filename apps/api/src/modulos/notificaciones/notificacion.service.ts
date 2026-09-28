import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createTransport, type Transporter } from 'nodemailer';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { ENTORNO, type Entorno } from '../../config/entorno';
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
 */
@Injectable()
export class NotificacionService {
  private readonly log = new Logger(NotificacionService.name);
  private readonly transporte: Transporter;
  private procesando = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {
    this.transporte = createTransport({
      host: entorno.SMTP_HOST,
      port: entorno.SMTP_PORT,
      secure: entorno.SMTP_SEGURO,
      auth: entorno.SMTP_USER
        ? { user: entorno.SMTP_USER, pass: entorno.SMTP_PASSWORD ?? '' }
        : undefined,
    });
  }

  /** Encola un correo en la misma transacción que la operación que lo origina. */
  async encolar(cliente: ClienteBd, destinatario: string, correo: CorreoRedactado) {
    return cliente.correoSaliente.create({
      data: {
        destinatario,
        asunto: correo.asunto,
        cuerpo_texto: correo.texto,
        cuerpo_html: correo.html,
      },
      select: { id: true },
    });
  }

  /** Cada minuto: envía lo pendiente y reintenta lo fallido cuyo turno ya llegó. */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'enviar-correos' })
  async procesarCola(): Promise<{ enviados: number; fallidos: number }> {
    if (this.procesando) return { enviados: 0, fallidos: 0 };
    this.procesando = true;
    try {
      const lote = await this.prisma.correoSaliente.findMany({
        where: {
          estado: { in: ['PENDIENTE', 'FALLIDO'] },
          intentos: { lt: MAX_INTENTOS },
          enviar_despues_de: { lte: new Date() },
        },
        orderBy: { creado_en: 'asc' },
        take: 50,
      });
      let enviados = 0;
      for (const correo of lote) {
        if (await this.enviar(correo)) enviados++;
      }
      return { enviados, fallidos: lote.length - enviados };
    } finally {
      this.procesando = false;
    }
  }

  private async enviar(correo: {
    id: string;
    destinatario: string;
    asunto: string;
    cuerpo_texto: string;
    cuerpo_html: string | null;
    intentos: number;
  }): Promise<boolean> {
    const intentos = correo.intentos + 1;
    try {
      await this.transporte.sendMail({
        from: this.entorno.CORREO_REMITENTE,
        to: correo.destinatario,
        subject: correo.asunto,
        text: correo.cuerpo_texto,
        html: correo.cuerpo_html ?? undefined,
      });
      await this.prisma.correoSaliente.update({
        where: { id: correo.id },
        data: { estado: 'ENVIADO', intentos, enviado_en: new Date(), ultimo_error: null },
      });
      return true;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      this.log.warn(`No se pudo enviar el correo ${correo.id} (intento ${intentos}): ${mensaje}`);
      await this.prisma.correoSaliente.update({
        where: { id: correo.id },
        data: {
          estado: 'FALLIDO',
          intentos,
          ultimo_error: mensaje.slice(0, 500),
          enviar_despues_de: new Date(Date.now() + esperaTrasIntento(intentos)),
        },
      });
      return false;
    }
  }
}
