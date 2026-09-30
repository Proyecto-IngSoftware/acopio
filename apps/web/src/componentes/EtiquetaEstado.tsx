import { Icono } from './Icono';

export type EstadoRed =
  'ACTIVO' | 'PAUSADO' | 'CERRADO' | 'SIN_ATENDER' | 'EN_ATENCION' | 'CUBIERTA';

// Siempre con ícono y texto (RNF-11). «Sin atender» va en neutro hasta decidir la paleta
// de Crítico y Urgente (diferencia aprobada de C9)
const ESTADOS: Record<EstadoRed, { texto: string; icono: string; clases: string }> = {
  ACTIVO: { texto: 'Activo', icono: 'check_circle', clases: 'bg-exito-container text-exito' },
  PAUSADO: {
    texto: 'Pausado',
    icono: 'pause_circle',
    clases: 'bg-tertiary-fixed text-tertiary-container',
  },
  CERRADO: {
    texto: 'Cerrado',
    icono: 'cancel',
    clases: 'bg-surface-container text-on-surface-variant',
  },
  SIN_ATENDER: {
    texto: 'Sin atender',
    icono: 'report',
    clases: 'bg-surface-container-high text-on-surface',
  },
  EN_ATENCION: {
    texto: 'En atención',
    icono: 'autorenew',
    clases: 'bg-tertiary-fixed text-tertiary-container',
  },
  CUBIERTA: { texto: 'Cubierta', icono: 'check_circle', clases: 'bg-exito-container text-exito' },
};

/** Estado de un acopio o de una zona. */
export function EtiquetaEstado({ estado }: { estado: EstadoRed }) {
  const e = ESTADOS[estado];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-md ${e.clases}`}
    >
      <Icono nombre={e.icono} className="text-[16px]" />
      {e.texto}
    </span>
  );
}
