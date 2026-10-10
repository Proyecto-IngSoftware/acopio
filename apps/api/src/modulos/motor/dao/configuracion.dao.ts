import { Injectable } from '@nestjs/common';
import { CANTIDAD_MINIMA_POR_DEFECTO, PESOS_POR_DEFECTO, type Pesos } from '@acopio/shared';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** La fila única de `configuracion_motor` y el candado del motor (ADR-0019). */
@Injectable()
export class ConfiguracionDao {
  constructor(private readonly prisma: PrismaService) {}

  /** Sin fila, los valores por defecto. */
  async leer(bd: ClienteBd = this.prisma) {
    const fila = await bd.configuracionMotor.findUnique({
      where: { id: 1 },
      include: { actualizador: { select: { nombre: true } } },
    });
    return {
      pesos: (fila?.pesos as Pesos | undefined) ?? PESOS_POR_DEFECTO,
      cantidadMinima: fila ? Number(fila.cantidad_minima) : CANTIDAD_MINIMA_POR_DEFECTO,
      actualizadoEn: fila?.actualizado_en ?? null,
      actualizadoPor: fila?.actualizador?.nombre ?? null,
    };
  }

  guardar(tx: ClienteBd, d: { pesos: Pesos; cantidadMinima: number; usuarioId: string }) {
    return tx.configuracionMotor.upsert({
      where: { id: 1 },
      update: {
        pesos: { ...d.pesos },
        cantidad_minima: d.cantidadMinima,
        actualizado_por: d.usuarioId,
        actualizado_en: new Date(),
      },
      create: {
        id: 1,
        pesos: { ...d.pesos },
        cantidad_minima: d.cantidadMinima,
        actualizado_por: d.usuarioId,
      },
    });
  }

  /**
   * Ordena el recálculo, las aprobaciones y los descartes entre sí. Se toma antes que
   * cualquier candado de saldo; nadie lo toma después de uno.
   */
  async bloquearMotor(tx: ClienteBd): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('motor:sugerencias', 0))`;
  }
}
