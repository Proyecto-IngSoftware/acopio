import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { Icono } from './Icono';

interface Props {
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
}

/** Hoja inferior (sistema de diseño §6): se abre sobre el contenido, al alcance del
 *  pulgar. Se cierra con Escape, con el botón o tocando fuera. Va en un portal sobre
 *  `body`: dentro de la cabecera, su `backdrop-blur` la encerraría en sus 80 px. */
export function Hoja({ titulo, alCerrar, children }: Props) {
  const id = useId();
  const cerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cerrar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [alCerrar]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-inverse-surface/60"
        aria-hidden="true"
        onClick={alCerrar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col gap-space-md overflow-y-auto rounded-t-xl bg-surface-container-lowest p-space-md pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-lg"
      >
        <span className="mx-auto h-1 w-10 rounded-full bg-outline-variant" aria-hidden="true" />
        <div className="flex items-start justify-between gap-space-sm">
          <h2 id={id} className="text-headline-sm text-on-surface">
            {titulo}
          </h2>
          <button
            ref={cerrar}
            type="button"
            aria-label="Cerrar"
            onClick={alCerrar}
            className="-mt-space-xs -mr-space-xs flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-on-surface-variant"
          >
            <Icono nombre="close" className="text-[24px]" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
