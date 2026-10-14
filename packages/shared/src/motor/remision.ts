/** Ciclo de vida de la remisión (RF-MOT-008, M-07). La API y la web leen la misma tabla. */
export type EstadoRemision = 'BORRADOR' | 'EN_TRANSITO' | 'RECIBIDA' | 'CANCELADA';
export type AccionRemision = 'editar' | 'despachar' | 'cancelar' | 'subirEvidencia' | 'recibir';

export const TRANSICIONES_REMISION: Record<
  AccionRemision,
  { origen: readonly EstadoRemision[]; destino: EstadoRemision | null }
> = {
  editar: { origen: ['BORRADOR'], destino: null },
  despachar: { origen: ['BORRADOR'], destino: 'EN_TRANSITO' },
  cancelar: { origen: ['BORRADOR', 'EN_TRANSITO'], destino: 'CANCELADA' },
  subirEvidencia: { origen: ['EN_TRANSITO'], destino: null },
  recibir: { origen: ['EN_TRANSITO'], destino: 'RECIBIDA' },
};

/** Fotos de evidencia por remisión (E2-01). */
export const MAXIMO_EVIDENCIAS = 5;

export function puedeRemision(estado: EstadoRemision, accion: AccionRemision): boolean {
  return TRANSICIONES_REMISION[accion].origen.includes(estado);
}

/** El estado después de la acción; `destino` null quiere decir que no cambia. */
export function estadoTras(estado: EstadoRemision, accion: AccionRemision): EstadoRemision {
  if (!puedeRemision(estado, accion)) {
    throw new Error(`La acción ${accion} no vale desde ${estado}`);
  }
  return TRANSICIONES_REMISION[accion].destino ?? estado;
}
