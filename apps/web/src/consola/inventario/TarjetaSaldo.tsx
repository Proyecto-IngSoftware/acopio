import type { ReactNode } from 'react';
import { formatearCantidad } from '@acopio/shared';
import type { ResultadoBusqueda } from '../../api/catalogo';

/** Categoría elegida en C4, C5 y C6, con su saldo. `children` va debajo del saldo. */
export function TarjetaSaldo({
  categoria,
  saldo,
  etiqueta = 'Saldo actual',
  onCambiar,
  children,
}: {
  categoria: ResultadoBusqueda;
  saldo: number;
  etiqueta?: string;
  onCambiar: () => void;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label="Categoría elegida"
      className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
    >
      <span className="flex flex-wrap items-center gap-space-xs">
        <span className="text-headline-sm font-bold text-on-surface">{categoria.nombre}</span>
        {categoria.perecedero && (
          <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-md text-primary-container">
            Perecedero
          </span>
        )}
        <button
          type="button"
          onClick={onCambiar}
          className="ml-auto min-h-[44px] rounded-lg px-space-sm text-label-md text-primary-container"
        >
          Cambiar
        </button>
      </span>
      <span className="text-body-md text-on-surface-variant">
        {etiqueta}:{' '}
        <b className="text-on-surface">{formatearCantidad(saldo, categoria.unidadBase)}</b>
      </span>
      {children}
    </section>
  );
}
