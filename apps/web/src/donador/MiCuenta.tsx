import { AccesoDonador } from './AccesoDonador';
import { MisDonaciones } from './MisDonaciones';
import { Esqueleto } from '../componentes/Esqueleto';
import { useSesion } from '../sesion/Sesion';

/** P13. Sin sesión, el acceso (crear cuenta o entrar); con sesión de Donador, «Mis donaciones». Diseño: docs/03-diseno/stitch/P13-mi-cuenta. */
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
  return <MisDonaciones />;
}
