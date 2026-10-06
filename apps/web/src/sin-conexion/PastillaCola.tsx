import { Link } from 'react-router';
import { Icono } from '../componentes/Icono';
import { useSesion } from '../sesion/Sesion';
import { useAvanceEnvio } from './Sincronizador';
import { useCola } from './useCola';

/**
 * «3 sin sincronizar» en la cabecera mientras haya entradas en la cola, y nada cuando no
 * las hay. Lleva a la lista de pendientes. Diseño: docs/03-diseno/stitch/C04-sin-conexion.
 */
export function PastillaCola() {
  const { usuario } = useSesion();
  const { data: cola = [] } = useCola(usuario?.id);
  const avance = useAvanceEnvio();
  const pendientes = cola.filter((e) => e.estado === 'pendiente').length;
  const rechazadas = cola.length - pendientes;
  if (cola.length === 0) return null;

  const [icono, texto] = avance
    ? ['cloud_upload', `Enviando ${avance.hechas + 1} de ${avance.total}`]
    : pendientes > 0
      ? ['cloud_off', `${pendientes} sin sincronizar`]
      : ['error', rechazadas === 1 ? '1 rechazada' : `${rechazadas} rechazadas`];

  return (
    <Link
      to="/consola/sin-sincronizar"
      className="flex min-h-[32px] shrink-0 items-center gap-1 rounded-full border border-outline-variant bg-surface-container-low px-2.5 text-label-md font-bold whitespace-nowrap text-on-surface tabular-nums"
    >
      <Icono
        nombre={icono}
        className={`text-[18px] ${avance ? 'text-primary-container' : 'text-on-surface-variant'}`}
      />
      {texto}
    </Link>
  );
}
