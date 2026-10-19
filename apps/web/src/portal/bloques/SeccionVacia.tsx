import type { ReactNode } from 'react';
import { Icono } from '../../componentes/Icono';

interface Props {
  id: string;
  titulo: string;
  icono: string;
  children: ReactNode;
}

/** Sección de la Portada cuyo módulo de backend aún no existe. */
export function SeccionVacia({ id, titulo, icono, children }: Props) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-space-sm">
      <h2 id={id} className="px-space-xs text-headline-sm font-bold text-on-surface">
        {titulo}
      </h2>
      <p className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md text-body-sm text-on-surface-variant">
        <Icono nombre={icono} className="text-[22px] text-primary-container" />
        <span>{children}</span>
      </p>
    </section>
  );
}
