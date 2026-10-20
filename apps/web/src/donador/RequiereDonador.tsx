import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Esqueleto } from '../componentes/Esqueleto';
import { useSesion } from '../sesion/Sesion';

/** Preparar una donación pide un Donador con sesión; sin ella se lleva a la pantalla de
 *  entrada, que vuelve aquí después. */
export function RequiereDonador({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  const { pathname, search } = useLocation();
  if (cargando) {
    return (
      <div className="px-margin py-space-lg">
        <Esqueleto etiqueta="Cargando" className="h-32" />
      </div>
    );
  }
  if (usuario?.rol !== 'DONADOR') {
    return <Navigate to={`/entrar?volver=${encodeURIComponent(pathname + search)}`} replace />;
  }
  return <>{children}</>;
}
