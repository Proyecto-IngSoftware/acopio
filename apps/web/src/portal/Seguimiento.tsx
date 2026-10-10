import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { formatearCantidad, type UnidadBase } from '@acopio/shared';
import { useSeguimiento, type Seguimiento as DatosSeguimiento } from '../api/donaciones';
import { Boton } from '../componentes/Boton';
import { Campo } from '../componentes/Campo';
import { EstadoError } from '../componentes/EstadoError';
import { Esqueleto } from '../componentes/Esqueleto';
import { Icono } from '../componentes/Icono';
import { fechaHora } from '../formato';

const NOMBRE_PASO: Record<DatosSeguimiento['pasos'][number]['paso'], string> = {
  PREPARADA: 'Preparada',
  RECIBIDA: 'Recibida',
  CONCILIADA: 'Conciliada',
  RECIBIDA_EN_DESTINO: 'Recibida en destino',
};

function Resultado({ folio }: { folio: string }) {
  const consulta = useSeguimiento(folio);
  if (consulta.isPending) return <Esqueleto etiqueta="Buscando la donación" className="h-48" />;
  if (consulta.isError) {
    return <EstadoError mensaje={consulta.error.message} alReintentar={() => consulta.refetch()} />;
  }
  const datos = consulta.data;
  if (datos === null) {
    return (
      <p
        role="alert"
        className="flex items-start gap-space-xs rounded-xl bg-surface-container-low p-space-md text-body-md text-on-surface"
      >
        <Icono nombre="search_off" className="text-[22px] text-on-surface-variant" />
        <span>
          No encontramos ese folio. Revisa que esté bien escrito: se ve como ACO-2026-7KQ4M.
        </span>
      </p>
    );
  }
  return (
    <article className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <div className="flex items-center justify-between gap-space-sm">
        <span className="font-mono text-label-md text-on-surface">{datos.folio}</span>
        <span className="rounded-full bg-surface-container-high px-space-sm py-1 text-label-sm text-on-surface-variant">
          {datos.estado}
        </span>
      </div>
      <ol aria-label="Avance de la donación" className="flex flex-col gap-space-sm">
        {datos.pasos.map((p) => {
          const hecho = p.en !== null;
          const nombre =
            p.paso === 'RECIBIDA' && p.acopio
              ? `${NOMBRE_PASO.RECIBIDA} en ${p.acopio}`
              : NOMBRE_PASO[p.paso];
          return (
            <li key={p.paso} className="flex items-center gap-space-sm">
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${hecho ? 'bg-primary-container text-on-primary' : 'border border-outline-variant text-on-surface-variant'}`}
              >
                <Icono
                  nombre={hecho ? 'check' : 'radio_button_unchecked'}
                  className="text-[18px]"
                />
              </span>
              <div className="flex flex-col">
                <span className="text-label-md text-on-surface">{nombre}</span>
                <span className="text-body-sm text-on-surface-variant">
                  {hecho ? fechaHora(p.en!) : 'Pendiente'}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      <h2 className="text-label-md text-on-surface">Lo que entró al acopio</h2>
      <ul className="flex flex-col divide-y divide-outline-variant">
        {datos.lineas.map((l) => (
          <li
            key={l.categoria}
            className="flex justify-between gap-space-sm py-space-xs text-body-md text-on-surface"
          >
            <span>{l.categoria}</span>
            <b>{formatearCantidad(l.cantidad, l.unidad as UnidadBase)}</b>
          </li>
        ))}
      </ul>
      <p className="text-body-sm text-on-surface-variant">No mostramos quién donó.</p>
    </article>
  );
}

/** El campo de folio. Sigue al folio de la URL (atrás, adelante o un enlace de la
 *  Portada), así nunca muestra uno distinto del que se consulta. */
function Buscador({ folio }: { folio: string }) {
  const navegar = useNavigate();
  const [escrito, fijarEscrito] = useState(folio);
  const [deLaUrl, fijarDeLaUrl] = useState(folio);
  if (folio !== deLaUrl) {
    fijarDeLaUrl(folio);
    fijarEscrito(folio);
  }

  function buscar(e: FormEvent) {
    e.preventDefault();
    const limpio = escrito.trim();
    if (limpio) navegar(`/seguimiento/${encodeURIComponent(limpio)}`);
  }

  return (
    <form onSubmit={buscar} className="flex items-end gap-space-sm">
      <div className="min-w-0 flex-1">
        <Campo
          id="folio"
          etiqueta="Folio"
          value={escrito}
          onChange={(e) => fijarEscrito(e.target.value)}
          placeholder="ACO-2026-7KQ4M"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
        />
      </div>
      <Boton type="submit">Buscar</Boton>
    </form>
  );
}

/** P10: seguimiento público por folio. Diseño: docs/03-diseno/stitch/P10-seguimiento. */
export function Seguimiento() {
  const { folio } = useParams();

  return (
    <section className="flex flex-col gap-space-md px-margin py-space-lg">
      <h1 className="text-headline-lg-mobile text-on-surface">Seguir una donación</h1>
      <Buscador folio={folio ?? ''} />
      {folio && <Resultado key={folio} folio={folio} />}
    </section>
  );
}
