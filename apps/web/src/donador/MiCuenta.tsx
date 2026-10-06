import { AccesoDonador } from './AccesoDonador';
import { Esqueleto } from '../componentes/Esqueleto';
import { useSesion } from '../sesion/Sesion';

/** P13. Sin sesión, el acceso (crear cuenta o entrar); con sesión de Donador, «Mis donaciones»,
 *  que llega en la tarea 5 del plan. Diseño: docs/03-diseno/stitch/P13-mi-cuenta. */
export function MiCuenta() {
  const { usuario, cargando } = useSesion();
  if (cargando) {
    return (
      <div className="px-margin py-space-lg">
        <Esqueleto etiqueta="Cargando" className="h-32" />
      </div>
    );
  }
  if (usuario?.rol !== 'DONADOR') return <AccesoDonador />;
  return (
    <section className="flex flex-col gap-space-md px-margin py-space-lg">
      <h1 className="text-headline-lg-mobile text-on-surface">Mi cuenta</h1>
    </section>
  );
}
