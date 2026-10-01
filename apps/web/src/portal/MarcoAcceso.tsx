import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { Esqueleto } from '../componentes/Esqueleto';
import { CabeceraAcceso } from './cabecera/CabeceraAcceso';

/** C01: cabecera de acceso y sin barra inferior. */
export function MarcoAcceso() {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-body-md text-on-surface">
      <CabeceraAcceso />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col pt-20">
        {/* Las pantallas se descargan al abrirlas: el marco queda y solo el contenido espera */}
        <Suspense fallback={<Esqueleto etiqueta="Cargando" className="h-48" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
