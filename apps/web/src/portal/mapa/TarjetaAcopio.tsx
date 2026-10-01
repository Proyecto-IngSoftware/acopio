import { tramoActual } from '@acopio/shared';
import { Link } from 'react-router';
import type { AcopioPublico } from '../../api/red';
import { EtiquetaEstado } from '../../componentes/EtiquetaEstado';
import { Icono } from '../../componentes/Icono';

/** «Abierto ahora · Cierra 17:00» para el público. */
export function aperturaPublica(a: Pick<AcopioPublico, 'estado' | 'abiertoAhora' | 'horario'>) {
  if (a.estado === 'PAUSADO') return 'Pausado por ahora: no está recibiendo';
  const tramo = tramoActual(a.horario, new Date());
  return a.abiertoAhora && tramo ? `Abierto ahora · Cierra ${tramo.cierra}` : 'Cerrado ahora';
}

export const km = (d: number) => `${d.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`;

/** Un acopio en la lista del mapa (P5), con enlace a su ficha (P6). */
export function TarjetaAcopio({ acopio, enlace }: { acopio: AcopioPublico; enlace: string }) {
  return (
    <Link
      to={enlace}
      className="flex items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-start justify-between gap-space-xs">
          <span className="text-body-lg font-semibold text-on-surface">{acopio.nombre}</span>
          {acopio.distanciaKm !== undefined && (
            <span className="shrink-0 text-label-md text-primary-container tabular-nums">
              {km(acopio.distanciaKm)}
            </span>
          )}
        </span>
        <span className="text-body-md text-on-surface-variant">{acopio.entidad.nombre}</span>
        <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <Icono nombre="location_on" className="text-[18px]" />
          {acopio.direccion} · {acopio.municipio}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-space-xs text-body-sm text-on-surface">
          <EtiquetaEstado estado={acopio.estado} />
          {aperturaPublica(acopio)}
        </span>
      </span>
      <Icono nombre="chevron_right" className="text-[22px] text-on-surface-variant" />
    </Link>
  );
}
