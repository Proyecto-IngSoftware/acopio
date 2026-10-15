import { formatearCantidad } from '@acopio/shared';
import type { Sugerencia } from '../../api/motor';
import { Boton } from '../../componentes/Boton';
import { Icono } from '../../componentes/Icono';
import { BarraCobertura } from './BarraCobertura';

export const formatoPuntaje = (n: number) =>
  n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const COMPONENTES = [
  ['criticidad', 'Criticidad'],
  ['urgencia', 'Urgencia'],
  ['proximidad', 'Proximidad'],
  ['magnitud', 'Magnitud'],
] as const;

/** Una sugerencia del motor: la ruta, la carga, el puntaje, la razón y sus cuatro partes. */
export function TarjetaSugerencia({
  sugerencia: s,
  alAprobar,
  alDescartar,
}: {
  sugerencia: Sugerencia;
  alAprobar?: () => void;
  alDescartar?: () => void;
}) {
  const unidad = s.categoria.unidad;
  return (
    <article className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
      <div className="flex items-start gap-space-sm">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1 text-label-caps uppercase text-on-surface-variant">
            <Icono nombre="local_shipping" className="text-[16px]" />
            Traslado sugerido
          </span>
          <h3 className="text-body-lg font-bold text-on-surface">
            {s.acopio.nombre} → {s.zona.nombre}
          </h3>
          <p className="text-body-md font-semibold text-on-surface">
            {s.categoria.nombre} · {formatearCantidad(s.cantidad, unidad)}
          </p>
        </div>
        <p className="flex shrink-0 flex-col items-center rounded-lg border border-outline-variant bg-surface-container-low px-space-sm py-space-xs">
          <span className="text-headline-sm text-primary-container tabular-nums">
            {formatoPuntaje(s.puntaje)}
          </span>
          <span className="text-label-caps uppercase text-on-surface-variant">puntaje</span>
        </p>
      </div>
      <p className="rounded-lg bg-surface-container-low p-space-sm text-body-md text-on-surface">
        {s.justificacion}
      </p>
      <dl className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-x-space-sm gap-y-1 text-body-sm text-on-surface-variant tabular-nums">
        {COMPONENTES.map(([clave, nombre]) => (
          <div key={clave} className="contents">
            <dt>{nombre}</dt>
            <dd>
              <BarraCobertura valor={s.desglose[clave]} etiqueta={nombre} />
            </dd>
            <dd className="text-right font-semibold text-on-surface">
              {formatoPuntaje(s.desglose[clave])}
            </dd>
          </div>
        ))}
      </dl>
      {s.estado === 'PROPUESTA' && alAprobar && alDescartar && (
        <div className="flex gap-space-sm">
          <Boton variante="terciario" className="flex-1" onClick={alDescartar}>
            Descartar
          </Boton>
          <Boton className="flex-1" onClick={alAprobar}>
            <Icono nombre="check" className="text-[20px]" />
            Aprobar
          </Boton>
        </div>
      )}
      {s.estado === 'APROBADA' && (
        <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Icono nombre="check_circle" className="text-[18px]" />
          Aprobada por {s.decididaPor} · {s.remisionCodigo} ·{' '}
          {s.cantidadAprobada !== null && formatearCantidad(s.cantidadAprobada, unidad)}
        </p>
      )}
      {s.estado === 'DESCARTADA' && (
        <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Icono nombre="block" className="text-[18px]" />
          Descartada por {s.decididaPor} · «{s.motivoDescarte}»
        </p>
      )}
    </article>
  );
}
