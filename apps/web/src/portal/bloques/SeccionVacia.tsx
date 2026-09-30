import type { ReactNode } from 'react';

interface Props {
  id: string;
  titulo: string;
  children: ReactNode;
}

/** Sección de la Portada cuyo módulo de backend aún no existe. */
export function SeccionVacia({ id, titulo, children }: Props) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-space-sm">
      <h2 id={id} className="px-space-xs text-headline-sm font-bold text-on-surface">
        {titulo}
      </h2>
      <p className="rounded-xl bg-surface-container-lowest p-space-md text-body-sm text-on-surface-variant shadow-sm">
        {children}
      </p>
    </section>
  );
}
