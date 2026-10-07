import { CANTIDAD_MINIMA_POR_DEFECTO, PESOS_POR_DEFECTO, type Pesos } from '@acopio/shared';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';

/** La fila única de configuracion_motor; sin fila, los valores por defecto. */
export async function leerConfiguracion(cliente: ClienteBd) {
  const fila = await cliente.configuracionMotor.findUnique({
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

/**
 * Ordena el recálculo y las aprobaciones entre sí. Se toma antes que cualquier candado
 * de saldo; nadie lo toma después de uno.
 */
export async function bloquearMotor(tx: ClienteBd): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('motor:sugerencias', 0))`;
}
