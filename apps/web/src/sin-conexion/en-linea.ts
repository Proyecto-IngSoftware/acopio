import { useSyncExternalStore } from 'react';

function suscribir(avisar: () => void) {
  window.addEventListener('online', avisar);
  window.addEventListener('offline', avisar);
  return () => {
    window.removeEventListener('online', avisar);
    window.removeEventListener('offline', avisar);
  };
}

/**
 * Si el navegador cree tener red. Es una pista: puede decir «con red» detrás de un
 * portal cautivo, así que quien envía igual trata el fallo de red (ErrorApi estado 0).
 */
export function useEnLinea(): boolean {
  return useSyncExternalStore(suscribir, () => navigator.onLine);
}
