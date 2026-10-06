import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Esqueleto } from '../componentes/Esqueleto';
import { useSesion } from '../sesion/Sesion';

/** Preparar una donación pide un Donador con sesión; sin ella se lleva a su cuenta, donde
 *  puede registrarse o entrar. */
export function RequiereDonador({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  if (cargando) {
    return (
      <div className="px-margin py-space-lg">
        <Esqueleto etiqueta="Cargando" className="h-32" />
      </div>
    );
  }
  if (usuario?.rol !== 'DONADOR') return <Navigate to="/donador" replace />;
  return <>{children}</>;
}
