import { datosFuente } from '@acopio/shared';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { urlImagenPlataforma, usePlataformas, type Plataforma } from '../../api/plataformas';
import { Icono } from '../../componentes/Icono';

const FUENTE = datosFuente('redacopio');

// Sin foto, la plataforma se ve con el ícono de su categoría, el mismo lenguaje de Stitch
const ICONO_CATEGORIA: Record<string, string> = {
  Donaciones: 'volunteer_activism',
  'Voluntariado profesional': 'handshake',
  Movilización: 'campaign',
  Información: 'info',
  Comunidad: 'diversity_3',
  Campaña: 'favorite',
  Mapa: 'map',
  Transporte: 'local_shipping',
};

/**
 * Otras plataformas que coordinan ayuda (pieza E), al final de Causas. No son causas: no tienen
 * sello y el aviso dice que Acopio no las verifica. `/plataformas` llega aquí por `#plataformas`.
 */
export function OtrasPlataformas() {
  const { data } = usePlataformas();
  const ref = useRef<HTMLElement>(null);
  const { hash } = useLocation();
  const hay = !!data && data.length > 0;
  useEffect(() => {
    if (hay && hash === '#plataformas') ref.current?.scrollIntoView?.({ block: 'start' });
  }, [hay, hash]);
  // Es un extra de Causas: si falla o no hay plataformas, la pantalla sigue sin la sección
  if (!hay) return null;
  return (
    <section
      ref={ref}
      id="plataformas"
      aria-labelledby="plataformas-titulo"
      className="flex scroll-mt-24 flex-col gap-space-sm border-t border-outline-variant pt-space-md"
    >
      <h2
        id="plataformas-titulo"
        className="flex items-center gap-space-xs text-headline-sm text-on-surface"
      >
        <Icono nombre="hub" className="text-[22px] text-primary-container" />
        Otras plataformas que ayudan
      </h2>
      <p className="text-body-md text-on-surface-variant">
        Proyectos que coordinan ayuda en paralelo, según la lista de{' '}
        <a
          href={`${FUENTE.url}herramientas`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-container underline"
        >
          {FUENTE.etiqueta}
        </a>
        . Acopio no los verifica: revisa cada sitio antes de donar.
      </p>
      <ul className="flex flex-col gap-space-sm">
        {data.map((p) => (
          <TarjetaPlataforma key={p.id} plataforma={p} />
        ))}
      </ul>
    </section>
  );
}

function TarjetaPlataforma({ plataforma: p }: { plataforma: Plataforma }) {
  const imagen = urlImagenPlataforma(p);
  return (
    <li className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-sm">
      {imagen ? (
        <img
          src={imagen}
          alt=""
          loading="lazy"
          className="size-20 shrink-0 rounded-lg bg-surface-container object-cover object-top"
        />
      ) : (
        <span className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary-container">
          <Icono nombre={ICONO_CATEGORIA[p.categoria] ?? 'hub'} className="text-[32px]" />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="w-fit rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
          {p.categoria}
        </span>
        <h3 className="text-body-lg font-semibold text-on-surface">{p.nombre}</h3>
        <p className="text-body-sm text-on-surface-variant">{p.descripcion}</p>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ir al sitio de ${p.nombre} (abre en otra pestaña)`}
          className="flex min-h-[44px] w-fit items-center gap-space-xs text-label-md text-primary-container"
        >
          Ir al sitio
          <Icono nombre="open_in_new" className="text-[18px]" />
        </a>
      </div>
    </li>
  );
}
