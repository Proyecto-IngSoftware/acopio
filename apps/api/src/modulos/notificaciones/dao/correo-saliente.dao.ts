import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

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

  /** Pendientes y fallidos con intentos por delante cuyo turno ya llegó, los más viejos primero. */
  listos(maxIntentos: number, limite: number) {
    return this.prisma.correoSaliente.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'FALLIDO'] },
        intentos: { lt: maxIntentos },
        enviar_despues_de: { lte: new Date() },
      },
      orderBy: { creado_en: 'asc' },
      take: limite,
    });
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
