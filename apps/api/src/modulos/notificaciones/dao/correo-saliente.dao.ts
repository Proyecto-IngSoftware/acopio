import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

type CorreoReclamado = {
  id: string;
  destinatario: string;
  asunto: string;
  cuerpo_texto: string;
  cuerpo_html: string | null;
  intentos: number;
  creado_en: Date;
};

/** La cola `correo_saliente`: se encola en la transacción de quien llama y se envía aparte. */
@Injectable()
export class CorreoSalienteDao {
  constructor(private readonly prisma: PrismaService) {}

  crear(
    tx: ClienteBd,
    datos: { destinatario: string; asunto: string; texto: string; html: string | null },
  ) {
    return tx.correoSaliente.create({
      data: {
        destinatario: datos.destinatario,
        asunto: datos.asunto,
        cuerpo_texto: datos.texto,
        cuerpo_html: datos.html,
      },
      select: { id: true },
    });
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
         SET enviar_despues_de = now() + ${prestamoMs} * interval '1 millisecond'
       WHERE id IN (
         SELECT id FROM correo_saliente
          WHERE estado IN ('PENDIENTE', 'FALLIDO')
            AND intentos < ${maxIntentos}
            AND enviar_despues_de <= now()
          ORDER BY creado_en
          LIMIT ${limite}
          FOR UPDATE SKIP LOCKED)
      RETURNING id, destinatario, asunto, cuerpo_texto, cuerpo_html, intentos, creado_en`;
    // RETURNING no garantiza orden
    return lote.sort((x, y) => x.creado_en.getTime() - y.creado_en.getTime());
  }

  marcarEnviado(id: string, intentos: number) {
    return this.prisma.correoSaliente.update({
      where: { id },
      data: { estado: 'ENVIADO', intentos, enviado_en: new Date(), ultimo_error: null },
    });
  }

  marcarFallido(id: string, intentos: number, error: string, reintentarEn: Date) {
    return this.prisma.correoSaliente.update({
      where: { id },
      data: { estado: 'FALLIDO', intentos, ultimo_error: error, enviar_despues_de: reintentarEn },
    });
  }
}
