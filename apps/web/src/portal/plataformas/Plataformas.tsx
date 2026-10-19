import { datosFuente } from '@acopio/shared';
import { usePlataformas } from '../../api/plataformas';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';

const FUENTE = datosFuente('redacopio');

/** P14 Otras plataformas que ayudan (pieza E). No son causas: Acopio no las verifica. */
export function Plataformas() {
  const { data, isPending, error, refetch } = usePlataformas();
  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <div className="flex flex-col gap-space-xs">
        <h1 className="text-headline-lg-mobile tracking-tight text-on-surface">
          Otras plataformas que ayudan
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Proyectos que coordinan ayuda en paralelo, según la lista de {FUENTE.etiqueta}. Acopio no
          las verifica: revisa cada sitio antes de donar.
        </p>
      </div>

      {isPending && <Esqueleto etiqueta="Cargando las plataformas" className="h-64" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && data.length === 0 && (
        <EstadoVacio titulo="Todavía no hay plataformas en la lista">
          Mientras tanto, en Causas están las campañas de entidades verificadas.
        </EstadoVacio>
      )}
      {data && data.length > 0 && (
        <ul className="flex flex-col gap-space-sm">
          {data.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
            >
              <span className="w-fit rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
                {p.categoria}
              </span>
              <h2 className="text-body-lg font-semibold text-on-surface">{p.nombre}</h2>
              <p className="text-body-md text-on-surface-variant">{p.descripcion}</p>
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
            </li>
          ))}
        </ul>
      )}

      {FUENTE.url && (
        <p className="text-body-sm text-on-surface-variant">
          Lista tomada de{' '}
          <a
            href={`${FUENTE.url}herramientas`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-container underline"
          >
            {FUENTE.etiqueta}
          </a>
          .
        </p>
      )}
    </div>
  );
}
