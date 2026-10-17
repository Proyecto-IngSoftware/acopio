import { useEffect, useRef } from 'react';

/** Al aparecer o cambiar `clave`, baja hasta el elemento y le pasa el foco: la tarjeta de lo
 *  elegido en el mapa queda debajo, a veces fuera de la pantalla. Sin animación si la persona
 *  pidió reducir el movimiento. */
export function useLlevarALaVista<T extends HTMLElement>(clave: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    el.scrollIntoView?.({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }, [clave]);
  return ref;
}
