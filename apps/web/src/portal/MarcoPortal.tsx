import { Suspense, useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router';
import { Esqueleto } from '../componentes/Esqueleto';
import { useSesion } from '../sesion/Sesion';
import { BarraNavegacion } from './BarraNavegacion';
import { CabeceraAcceso } from './cabecera/CabeceraAcceso';
import { CabeceraConSesion } from './cabecera/CabeceraConSesion';
import { CabeceraDonador } from './cabecera/CabeceraDonador';
import { CabeceraPublica } from './cabecera/CabeceraPublica';
import { direccionEntre } from './direccion';

// Pantallas que en escritorio usan más que el ancho de un teléfono (J-06)
const AMPLIAS = ['/consola/accesos'];

/** Columna de ancho de teléfono entre la cabecera y la barra fijas. */
export function MarcoPortal() {
  const { usuario, cargando } = useSesion();
  const { pathname } = useLocation();
  const tipo = useNavigationType();
  const amplia = AMPLIAS.includes(pathname);
  // La dirección se decide una vez por ruta: si el marco se vuelve a dibujar en la misma ruta
  // (cambia la consulta, llega la sesión), la clase se conserva y la entrada no se corta
  const transicion = useRef<{ ruta: string | null; clase: string }>({ ruta: null, clase: '' });
  if (transicion.current.ruta !== pathname) {
    const direccion = direccionEntre(transicion.current.ruta, pathname, tipo);
    transicion.current = {
      ruta: pathname,
      clase:
        direccion === 'adelante' ? 'entra-adelante' : direccion === 'atras' ? 'entra-atras' : '',
    };
  }
  const entrada = transicion.current.clase;
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
        className={`mx-auto flex w-full flex-1 flex-col overflow-x-clip pt-20 pb-20 ${amplia ? 'max-w-md md:max-w-5xl' : 'max-w-md'}`}
      >
        {/* Las pantallas se descargan al abrirlas: el marco queda y solo el contenido espera */}
        <div key={pathname} className={`flex w-full flex-1 flex-col ${entrada}`}>
          <Suspense fallback={<Esqueleto etiqueta="Cargando" className="h-48" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <BarraNavegacion />
    </div>
  );
}
