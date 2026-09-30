import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { EnlaceBoton } from '../componentes/Boton';
import { Esqueleto } from '../componentes/Esqueleto';
import type { Rol } from '../sesion/cliente-auth';
import { useSesion } from '../sesion/Sesion';

/** Guard de la consola (R-03): sin sesión lleva a Entrar; con otro rol lo dice. La API
 *  aplica los mismos permisos; esto solo evita mostrar una pantalla que daría 403. */
export function RequiereRol({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  if (cargando) {
    return (
      <div className="px-margin py-space-lg">
        <Esqueleto etiqueta="Cargando" className="h-32" />
      </div>
    );
  }
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (!roles.includes(usuario.rol)) {
    return (
      <section className="flex flex-col items-start gap-space-md px-margin py-space-lg">
        <h1 className="text-headline-lg-mobile text-on-surface">No tienes acceso</h1>
        <p className="text-on-surface-variant">
          Tu rol no permite usar esta herramienta. Si la necesitas, pídesela a un administrador.
        </p>
        <EnlaceBoton a="/mas" variante="secundario">
          Volver a Más
        </EnlaceBoton>
      </section>
    );
  }
  return <>{children}</>;
}
