import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSesion } from '../sesion/Sesion';
import { enviarCola, esperaReintento, type ResultadoEnvio } from './cola';

const PEDIDO = 'acopio:enviar-cola';

/** Una pantalla pide enviar la cola ya (C4 al abrir, O-03). */
export function pedirEnvio() {
  window.dispatchEvent(new Event(PEDIDO));
}

/**
 * Envía la cola de quien tiene la sesión: al abrir la app, cuando vuelve la señal y
 * cuando una pantalla lo pide. Si falla por la red o el servidor, reintenta con una
 * espera que crece hasta 5 minutos (O-03). Va una sola vez, junto a las rutas.
 */
export function Sincronizador({
  espera = esperaReintento,
}: {
  espera?: (intento: number) => number;
}) {
  const { usuario } = useSesion();
  const consultas = useQueryClient();
  const usuarioId = usuario?.id;

  useEffect(() => {
    if (!usuarioId) return;
    let vigente = true;
    let intento = 0;
    let reloj: ReturnType<typeof setTimeout> | undefined;

    const enviar = async () => {
      clearTimeout(reloj);
      const r: ResultadoEnvio = await enviarCola(usuarioId).catch(() => ({
        estado: 'reintentar' as const,
        enviadas: 0,
      }));
      if (!vigente) return;
      if (r.enviadas > 0) {
        void consultas.invalidateQueries({ queryKey: ['saldos'] });
        void consultas.invalidateQueries({ queryKey: ['historial'] });
      }
      // Sin red no hace falta el reloj: el evento online vuelve a llamar
      if (r.estado === 'reintentar' && navigator.onLine) {
        reloj = setTimeout(() => void enviar(), espera(intento++));
      } else if (r.estado === 'listo') {
        intento = 0;
      }
    };

    const alAvisar = () => void enviar();
    void enviar();
    window.addEventListener('online', alAvisar);
    window.addEventListener(PEDIDO, alAvisar);
    return () => {
      vigente = false;
      clearTimeout(reloj);
      window.removeEventListener('online', alAvisar);
      window.removeEventListener(PEDIDO, alAvisar);
    };
  }, [usuarioId, espera, consultas]);

  return null;
}
