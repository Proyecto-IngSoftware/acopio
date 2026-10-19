import type { ReactNode } from 'react';
import { Icono } from '../../componentes/Icono';

export const BOTON =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-space-xs rounded-xl px-space-md text-label-md';

/** Una sección de la ficha (P6), con su ícono y su título. */
export function Tarjeta({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono: string;
  children: ReactNode;
}) {
  const id = `ficha-${titulo.replace(/\W+/g, '-')}`;
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
    >
      <h2 id={id} className="flex items-center gap-space-xs text-headline-sm text-on-surface">
        <Icono nombre={icono} className="text-[22px] text-primary-container" />
        {titulo}
      </h2>
      {children}
    </section>
  );
}
