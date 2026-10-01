import { Icono } from './Icono';

export type EstadoSemaforo = 'SIN_UMBRAL' | 'BAJO' | 'CERCA' | 'EN_RANGO' | 'SOBRE';

/** De lo más urgente a lo menos: así ordena C3 «Más urgente». */
export const ORDEN_URGENCIA: EstadoSemaforo[] = [
  'BAJO',
  'CERCA',
  'SOBRE',
  'EN_RANGO',
  'SIN_UMBRAL',
];

// Siempre con ícono y texto además del color (RNF-11)
export const SEMAFORO: Record<EstadoSemaforo, { texto: string; icono: string; clases: string }> = {
  BAJO: {
    texto: 'Bajo el mínimo',
    icono: 'warning',
    clases: 'bg-error-container text-on-error-container',
  },
  CERCA: {
    texto: 'Cerca del mínimo',
    icono: 'trending_down',
    clases: 'bg-tertiary-fixed text-tertiary-container',
  },
  EN_RANGO: { texto: 'En rango', icono: 'check_circle', clases: 'bg-exito-container text-exito' },
  SOBRE: { texto: 'Sobre el máximo', icono: 'inventory', clases: 'bg-sobra-container text-sobra' },
  SIN_UMBRAL: {
    texto: 'Sin umbral',
    icono: 'remove',
    clases: 'bg-surface-container text-on-surface-variant',
  },
};

/** Estado del saldo de una categoría frente a su umbral (RF-INV-005). */
export function EtiquetaSemaforo({ estado }: { estado: EstadoSemaforo }) {
  const e = SEMAFORO[estado];
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-label-md ${e.clases}`}
    >
      <Icono nombre={e.icono} className="text-[16px]" />
      {e.texto}
    </span>
  );
}
