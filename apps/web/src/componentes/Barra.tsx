import { useEffect, useState } from 'react';
import { prefiereMenosMovimiento } from './movimiento';

interface Props {
  valor: number;
  total: number;
  etiqueta: string;
  /** `aviso` pinta en ámbar, por ejemplo cuando quedan pocos cupos. */
  tono?: 'marca' | 'aviso';
  className?: string;
}

/** Medidor delgado que se llena al aparecer (cupos, faltantes del balance). */
export function Barra({ valor, total, etiqueta, tono = 'marca', className = '' }: Props) {
  const [lleno, fijarLleno] = useState(prefiereMenosMovimiento);
  useEffect(() => {
    if (lleno) return;
    const t = setTimeout(() => fijarLleno(true), 30);
    return () => clearTimeout(t);
  }, [lleno]);
  const porcentaje = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  return (
    <div
      role="meter"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={valor}
      className={`h-1.5 overflow-hidden rounded-full bg-surface-container-high ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-1000 ease-[var(--curva)] ${
          tono === 'aviso' ? 'bg-tertiary-container' : 'bg-surface-tint'
        }`}
        style={{ width: `${lleno ? porcentaje : 0}%` }}
      />
    </div>
  );
}
