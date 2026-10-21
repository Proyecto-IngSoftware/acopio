import type { ReactNode } from 'react';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import type { NombreIlustracion } from '../../componentes/ilustraciones/Ilustracion';

interface Props {
  id: string;
  titulo: string;
  /** Título del estado vacío, bajo el de la sección. */
  vacio: string;
  ilustracion: NombreIlustracion;
  children: ReactNode;
}

/** Sección de la Portada cuyo módulo de backend aún no existe. */
export function SeccionVacia({ id, titulo, vacio, ilustracion, children }: Props) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-space-sm">
      <h2 id={id} className="px-space-xs text-headline-sm font-bold text-on-surface">
        {titulo}
      </h2>
      <EstadoVacio titulo={vacio} ilustracion={ilustracion}>
        {children}
      </EstadoVacio>
    </section>
  );
}
