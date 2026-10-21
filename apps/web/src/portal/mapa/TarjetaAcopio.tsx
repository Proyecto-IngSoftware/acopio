import { tramoActual } from '@acopio/shared';
import { Link } from 'react-router';
import type { AcopioPublico } from '../../api/red';
import { EtiquetaEstado } from '../../componentes/EtiquetaEstado';
import { Icono } from '../../componentes/Icono';
import { ESTILO_ESTADO } from './marcador';
import type { EtiquetaMapa } from './necesidad';

/** «Abierto ahora · Cierra 17:00» para el público. */
export function aperturaPublica(a: Pick<AcopioPublico, 'estado' | 'abiertoAhora' | 'horario'>) {
  if (a.estado === 'PAUSADO') return 'Pausado por ahora: no está recibiendo';
  const tramo = tramoActual(a.horario, new Date());
  return a.abiertoAhora && tramo ? `Abierto ahora · Cierra ${tramo.cierra}` : 'Cerrado ahora';
}

export const km = (d: number) => `${d.toLocaleString('es-CO', { maximumFractionDigits: 1 })} km`;

/** La etiqueta del mapa como píldora, en el color y con el ícono de su estado. La `mini` es la
 *  de la leyenda: unos 20 px de alto, con el ícono de 12 px. */
export function PildoraEstado({
  etiqueta,
  mini = false,
}: {
  etiqueta: EtiquetaMapa;
  mini?: boolean;
}) {
  const e = ESTILO_ESTADO[etiqueta.estado];
  const tamano = mini
    ? 'shrink-0 gap-0.5 px-1.5 py-0.5 text-label-caps'
    : 'gap-1 px-2 py-0.5 text-label-md font-bold';
  return (
    <span className={`inline-flex w-fit items-center rounded-[999px] ${tamano} ${e.clases}`}>
      <Icono nombre={e.icono} className={mini ? 'text-[12px]' : 'text-[14px]'} />
      {etiqueta.texto}
    </span>
  );
}

/** Un acopio en la lista del mapa (P5), con enlace a su ficha (P6). Con `noRecibe` (el nombre
 *  de la categoría elegida) se ve apagado y lo dice. */
export function TarjetaAcopio({
  acopio,
  enlace,
  etiqueta,
  noRecibe,
}: {
  acopio: AcopioPublico;
  enlace: string;
  etiqueta?: EtiquetaMapa | null;
  noRecibe?: string;
}) {
  return (
    <Link
      to={enlace}
      className={`flex items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md${noRecibe ? ' opacity-60' : ''}`}
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
        {etiqueta && <PildoraEstado etiqueta={etiqueta} />}
        {noRecibe && (
          <span className="flex items-center gap-1 text-body-sm font-semibold text-on-surface-variant">
            <Icono nombre="block" className="text-[18px]" />
            No recibe {noRecibe.toLocaleLowerCase('es-CO')}
          </span>
        )}
        <span className="text-body-md text-on-surface-variant">{acopio.entidad?.nombre}</span>
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
