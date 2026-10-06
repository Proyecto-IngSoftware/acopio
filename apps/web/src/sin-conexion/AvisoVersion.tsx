import { useRegisterSW } from 'virtual:pwa-register/react';
import { Icono } from '../componentes/Icono';

/**
 * Franja de versión nueva del service worker (ADR-0016). Con `registerType: 'prompt'` la
 * web recarga solo cuando la persona toca «Actualizar», nunca a mitad de una captura.
 * Diseño: docs/03-diseno/stitch/C04-sin-conexion.
 */
export function AvisoVersion() {
  const {
    needRefresh: [hayNueva],
    updateServiceWorker,
  } = useRegisterSW();
  if (!hayNueva) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-50 mx-auto flex w-[calc(100%-1.5rem)] max-w-md items-center gap-space-sm rounded-xl bg-inverse-surface py-space-xs pr-space-xs pl-space-md text-body-md text-inverse-on-surface shadow-lg"
    >
      <Icono nombre="system_update" className="text-[22px]" />
      <span className="flex-1">Hay una versión nueva de Acopio.</span>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="min-h-[44px] rounded-lg px-space-sm font-bold text-primary-fixed-dim"
      >
        Actualizar
      </button>
    </div>
  );
}
