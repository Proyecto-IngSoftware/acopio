import type { Ref } from 'react';
import type { ZonaPublica } from '../../api/red';
import { Icono } from '../../componentes/Icono';
import { haceCuanto } from '../../formato';
import { useLlevarALaVista } from './llevarALaVista';

interface Props {
  zona: ZonaPublica;
  /** En el mapa la tarjeta se cierra; en la lista no */
  alCerrar?: () => void;
  /** Encabezado propio de la tarjeta; en la lista, la sección ya tiene el suyo */
  etiqueta?: string;
}

/** Lo que falta en una zona (HU-13.1): categoría, la nota pública tal cual y su antigüedad.
 *  La API no entrega nombre ni dirección de la zona, y la tarjeta no los inventa. */
export function TarjetaZona({ zona, alCerrar, etiqueta }: Props) {
  const n = zona.necesidades.length;
  return alCerrar ? (
    <TarjetaElegida zona={zona} alCerrar={alCerrar} etiqueta={etiqueta} n={n} />
  ) : (
    <Contenido zona={zona} etiqueta={etiqueta} n={n} />
  );
}

/** La del mapa: al elegirla, la página baja hasta ella. */
function TarjetaElegida(props: Props & { n: number }) {
  const ref = useLlevarALaVista<HTMLElement>(props.zona.zonaId);
  return <Contenido {...props} refTarjeta={ref} />;
}

function Contenido({
  zona,
  alCerrar,
  etiqueta,
  n,
  refTarjeta,
}: Props & { n: number; refTarjeta?: Ref<HTMLElement> }) {
  return (
    <section
      ref={refTarjeta}
      tabIndex={refTarjeta ? -1 : undefined}
      aria-label={etiqueta}
      className={`flex scroll-mt-24 flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md outline-none ${alCerrar ? 'border-2 border-primary-container shadow-md' : 'border border-outline-variant'}`}
    >
      <div className="flex items-start gap-space-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary-container">
          <Icono nombre="campaign" className="text-[20px]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body-lg font-semibold text-on-surface">Zona con necesidad</span>
          <span className="text-body-sm text-on-surface-variant">
            Radio de {zona.radioKm} km ·{' '}
            {alCerrar
              ? 'lo reporta quien recibe las ayudas en la zona'
              : `${n} ${n === 1 ? 'categoría' : 'categorías'}`}
          </span>
        </span>
        {alCerrar && (
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="-mt-space-xs -mr-space-xs flex size-11 shrink-0 items-center justify-center rounded-full text-on-surface-variant"
          >
            <Icono nombre="close" />
          </button>
        )}
      </div>
      <ul className="flex flex-col">
        {zona.necesidades.map((x) => (
          <li
            key={x.categoria}
            className="flex flex-col gap-1 border-t border-outline-variant py-space-sm"
          >
            <span className="flex items-baseline gap-space-xs">
              <span className="text-body-md font-semibold text-on-surface">{x.categoria}</span>
              <span className="ml-auto shrink-0 text-body-sm text-on-surface-variant tabular-nums">
                {haceCuanto(x.reportadoEn)}
              </span>
            </span>
            {x.nota ? (
              <span className="text-body-md italic text-on-surface">«{x.nota}»</span>
            ) : (
              <span className="text-body-sm text-on-surface-variant">Sin nota</span>
            )}
          </li>
        ))}
      </ul>
      {alCerrar && (
        <p className="flex gap-space-xs text-body-sm text-on-surface-variant">
          <Icono nombre="info" className="shrink-0 text-[18px] text-primary-container" />
          Las donaciones no se llevan a la zona. Llévalas a un acopio del mapa, y desde ahí salen
          hacia donde falta.
        </p>
      )}
    </section>
  );
}
