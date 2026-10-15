import { NOMBRE_ESTADO, type EstadoRemision } from '../../api/remisiones';
import { Icono } from '../../componentes/Icono';

const ICONO: Record<EstadoRemision, string> = {
  BORRADOR: 'edit_note',
  EN_TRANSITO: 'local_shipping',
  RECIBIDA: 'check_circle',
  CANCELADA: 'cancel',
};

/** El estado de una remisión, con ícono y texto (RNF-11), en neutro: no es inventario. */
export function EtiquetaRemision({ estado }: { estado: EstadoRemision }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-container px-space-sm py-1 text-label-md text-on-surface">
      <Icono nombre={ICONO[estado]} className="text-[16px]" />
      {NOMBRE_ESTADO[estado]}
    </span>
  );
}
