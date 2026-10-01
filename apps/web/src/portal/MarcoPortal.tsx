import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { Esqueleto } from '../componentes/Esqueleto';
import { useSesion } from '../sesion/Sesion';
import { BarraNavegacion } from './BarraNavegacion';
import { CabeceraAcceso } from './cabecera/CabeceraAcceso';
import { CabeceraConSesion } from './cabecera/CabeceraConSesion';
import { CabeceraPublica } from './cabecera/CabeceraPublica';

/** Columna de ancho de teléfono entre la cabecera y la barra fijas. */
export function MarcoPortal() {
  const { usuario, cargando } = useSesion();
  return (
    <div className="flex min-h-screen flex-col bg-surface text-body-md text-on-surface">
      {/* Mientras se sabe si hay sesión, solo la marca: evita mostrar «Entrar» de más */}
      {cargando ? (
        <CabeceraAcceso />
      ) : usuario ? (
        <CabeceraConSesion usuario={usuario} />
      ) : (
        <CabeceraPublica />
      )}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col pt-20 pb-20">
        {/* Las pantallas se descargan al abrirlas: el marco queda y solo el contenido espera */}
        <Suspense fallback={<Esqueleto etiqueta="Cargando" className="h-48" />}>
          <Outlet />
        </Suspense>
      </main>
      <BarraNavegacion />
    </div>
  );
}
