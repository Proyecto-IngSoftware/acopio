import { Injectable } from '@nestjs/common';
import { LIMITES_TURNOS } from '@acopio/shared';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import { Prisma } from '../../../generado/prisma/client';

const correoVigente = Prisma.sql`
  NOT EXISTS (
    SELECT 1 FROM reserva r JOIN jornada j ON j.id = r.jornada_id
    WHERE r.id = correo_saliente.reserva_id
      AND (r.datos_borrados_en IS NOT NULL OR j.fin <= now()
        - make_interval(hours => ${24 * LIMITES_TURNOS.diasBorrado}::int))
  )`;

export type CorreoReclamado = {
  id: string;
  destinatario: string;
  asunto: string;
  cuerpo_texto: string;
  cuerpo_html: string | null;
  intentos: number;
  creado_en: Date;
  reclamo_id: string;
};

/** La cola `correo_saliente`: se encola en la transacción de quien llama y se envía aparte. */
@Injectable()
export class CorreoSalienteDao {
  constructor(private readonly prisma: PrismaService) {}

  crear(
    tx: ClienteBd,
    datos: {
      destinatario: string;
      asunto: string;
      texto: string;
      html: string | null;
      reservaId?: string;
    },
  ) {
    return tx.correoSaliente.create({
      data: {
        destinatario: datos.destinatario,
        asunto: datos.asunto,
        cuerpo_texto: datos.texto,
        cuerpo_html: datos.html,
        reserva_id: datos.reservaId,
      },
      select: { id: true },
    });
  }

  async borrarDeReservasVencidas(tx: ClienteBd, limite: Date) {
    const { count } = await tx.correoSaliente.deleteMany({
      where: {
        reserva: {
          is: { OR: [{ datos_borrados_en: { not: null } }, { jornada: { fin: { lte: limite } } }] },
        },
      },
    });
    return count;
  }

  /**
   * Toma un lote de pendientes y fallidos cuyo turno ya llegó, los más viejos primero, y lo
   * presta: corre su `enviar_despues_de` para que otra instancia no lo vea listo (P-089).
   * SKIP LOCKED hace que dos instancias que reclaman a la vez se repartan las filas. Si quien
   * reclamó se cae antes de marcarlas, el préstamo vence y vuelven a estar listas.
   */
  async reclamar(maxIntentos: number, limite: number, prestamoMs: number) {
    const lote = await this.prisma.$queryRaw<CorreoReclamado[]>`
      UPDATE correo_saliente
         SET enviar_despues_de = now() + ${prestamoMs} * interval '1 millisecond',
             reclamo_id = gen_random_uuid()
       WHERE id IN (
         SELECT id FROM correo_saliente
          WHERE estado IN ('PENDIENTE', 'FALLIDO')
            AND intentos < ${maxIntentos}
            AND enviar_despues_de <= now()
            AND ${correoVigente}
          ORDER BY creado_en
          LIMIT ${limite}
          FOR UPDATE SKIP LOCKED)
      RETURNING id, destinatario, asunto, cuerpo_texto, cuerpo_html, intentos, creado_en, reclamo_id`;
    // RETURNING no garantiza orden
    return lote.sort((x, y) => x.creado_en.getTime() - y.creado_en.getTime());
  }

  async renovar({ id, reclamo_id }: CorreoReclamado, prestamoMs: number) {
    const filas = await this.prisma.$executeRaw`
      UPDATE correo_saliente
         SET enviar_despues_de = now() + ${prestamoMs} * interval '1 millisecond'
       WHERE id = ${id}::uuid AND reclamo_id = ${reclamo_id}::uuid
         AND enviar_despues_de > now()
         AND ${correoVigente}`;
    return filas === 1;
  }

  marcarEnviado({ id, reclamo_id }: CorreoReclamado, intentos: number) {
    return this.prisma.correoSaliente.updateMany({
      where: { id, reclamo_id },
      data: {
        estado: 'ENVIADO',
        intentos,
        enviado_en: new Date(),
        ultimo_error: null,
        reclamo_id: null,
      },
    });
  }

  marcarFallido(
    { id, reclamo_id }: CorreoReclamado,
    intentos: number,
    error: string,
    reintentarEn: Date,
  ) {
    return this.prisma.correoSaliente.updateMany({
      where: { id, reclamo_id },
      data: {
        estado: 'FALLIDO',
        intentos,
        ultimo_error: error,
        enviar_despues_de: reintentarEn,
        reclamo_id: null,
      },
    });
  }
}
