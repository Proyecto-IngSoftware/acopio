import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { Icono } from './Icono';
import { prefiereMenosMovimiento } from './movimiento';

// Lo que dura la salida (clases hoja-sale y velo-sale de estilos.css)
const SALIDA_MS = 250;

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
  // La última `alCerrar` en una referencia: quien la pasa en línea crea una nueva en cada
  // render, y el efecto de abajo volvería a enfocar «Cerrar» con cada tecla del formulario
  const alCerrarActual = useRef(alCerrar);
  useEffect(() => {
    alCerrarActual.current = alCerrar;
  });

  // Escape, «Cerrar» y el velo pasan por aquí: la hoja baja y luego avisa, una sola vez
  const [saliendo, fijarSaliendo] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  const salir = useCallback(() => {
    if (prefiereMenosMovimiento()) return alCerrarActual.current();
    if (temporizador.current !== undefined) return;
    fijarSaliendo(true);
    temporizador.current = setTimeout(() => {
      // Si quien la abrió la deja montada, la hoja vuelve a entrar y se puede cerrar otra vez
      temporizador.current = undefined;
      fijarSaliendo(false);
      alCerrarActual.current();
    }, SALIDA_MS);
  }, []);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  useEffect(() => {
    cerrar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && salir();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [salir]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-inverse-surface/60 ${saliendo ? 'velo-sale' : 'velo-entra'}`}
        aria-hidden="true"
        onClick={salir}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`${saliendo ? 'hoja-sale' : 'hoja-entra'} relative flex max-h-[85vh] w-full max-w-md flex-col gap-space-md overflow-y-auto rounded-t-xl bg-surface-container-lowest p-space-md pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-lg`}
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
            onClick={salir}
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
