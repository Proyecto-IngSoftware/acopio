import { Outlet } from 'react-router';
import { BarraNavegacion } from './BarraNavegacion';
import { Cabecera } from './Cabecera';

/** Columna de ancho de teléfono entre la cabecera y la barra fijas. */
export function MarcoPortal() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-body-md text-on-surface">
      <Cabecera />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col pt-20 pb-20">
        <Outlet />
      </main>
      <BarraNavegacion />
    </div>
  );
}
