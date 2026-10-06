import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Esqueleto } from '../componentes/Esqueleto';
import { useSesion } from '../sesion/Sesion';
import { BarraNavegacion } from './BarraNavegacion';
import { CabeceraAcceso } from './cabecera/CabeceraAcceso';
import { CabeceraConSesion } from './cabecera/CabeceraConSesion';
import { CabeceraDonador } from './cabecera/CabeceraDonador';
import { CabeceraPublica } from './cabecera/CabeceraPublica';

// Pantallas que en escritorio usan más que el ancho de un teléfono (J-06)
const AMPLIAS = ['/consola/accesos'];

/** Columna de ancho de teléfono entre la cabecera y la barra fijas. */
export function MarcoPortal() {
  const { usuario, cargando } = useSesion();
  const amplia = AMPLIAS.includes(useLocation().pathname);
  return (
    <div className="flex min-h-screen flex-col bg-surface text-body-md text-on-surface">
      {/* Mientras se sabe si hay sesión, solo la marca: evita mostrar «Entrar» de más */}
      {cargando ? (
        <CabeceraAcceso />
      ) : usuario?.rol === 'DONADOR' ? (
        <CabeceraDonador usuario={usuario} />
      ) : usuario ? (
        <CabeceraConSesion usuario={usuario} />
      ) : (
        <CabeceraPublica />
      )}
      <main
        className={`mx-auto flex w-full flex-1 flex-col pt-20 pb-20 ${amplia ? 'max-w-md md:max-w-5xl' : 'max-w-md'}`}
      >
        {/* Las pantallas se descargan al abrirlas: el marco queda y solo el contenido espera */}
        <Suspense fallback={<Esqueleto etiqueta="Cargando" className="h-48" />}>
          <Outlet />
        </Suspense>
      </main>
      <BarraNavegacion />
    </div>
  );
}
