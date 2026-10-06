import { useState } from 'react';
import { Link } from 'react-router';
import { formatearCantidad } from '@acopio/shared';
import {
  ESTADOS_DONACION,
  useCancelarDonacion,
  useMisDonaciones,
  type Donacion,
  type EstadoComprobante,
} from '../api/donaciones';
import { Boton, EnlaceBoton } from '../componentes/Boton';
import { EstadoError } from '../componentes/EstadoError';
import { EstadoVacio } from '../componentes/EstadoVacio';
import { Esqueleto } from '../componentes/Esqueleto';
import { Hoja } from '../componentes/Hoja';
import { Icono } from '../componentes/Icono';
import { haceCuanto } from '../formato';

type Filtro = 'TODAS' | EstadoComprobante;

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'TODAS', texto: 'Todas' },
  { valor: 'PREPARADO', texto: 'Preparadas' },
  { valor: 'PENDIENTE', texto: 'Recibidas' },
  { valor: 'CONCILIADO', texto: 'Conciliadas' },
  { valor: 'CANCELADO', texto: 'Canceladas' },
];

/** Lo que lleva la donación en unidad base: lo confirmado si ya se recibió, si no lo declarado. */
function resumen(d: Donacion): string {
  return d.lineas
    .map(
      (l) =>
        `${l.categoria} ${formatearCantidad((l.cantidadConfirmada ?? l.cantidadDeclarada) * l.contenidoUnitario, l.unidad)}`,
    )
    .join(' · ');
}

const ENLACE_SECUNDARIO =
  'inline-flex min-h-[48px] flex-1 items-center justify-center gap-space-xs rounded-xl border-[1.5px] border-primary-container bg-surface-container-lowest px-space-md font-label-md text-label-md text-primary-container';

/** P13 con sesión: las donaciones del Donador. Diseño: docs/03-diseno/stitch/P13-mi-cuenta. */
export function MisDonaciones() {
  const [filtro, fijarFiltro] = useState<Filtro>('TODAS');
  const donaciones = useMisDonaciones(filtro === 'TODAS' ? undefined : filtro);
  const cancelar = useCancelarDonacion();
  const [porCancelar, fijarPorCancelar] = useState<Donacion | null>(null);

  function cerrarHoja() {
    fijarPorCancelar(null);
    cancelar.reset();
  }

  return (
    <section className="flex flex-col gap-space-md px-margin py-space-lg">
      <h1 className="text-headline-lg-mobile text-on-surface">Mis donaciones</h1>
      <EnlaceBoton a="/donar">
        <Icono nombre="add" className="text-[22px]" />
        Preparar una donación
      </EnlaceBoton>
      <p className="flex items-center gap-space-xs rounded-xl bg-surface-container-low p-space-sm text-body-sm text-on-surface-variant">
        <Icono nombre="schedule" className="text-[20px]" />
        Una donación preparada vence a los 7 días si no la entregas.
      </p>
      <div role="radiogroup" aria-label="Estado" className="flex flex-wrap gap-space-xs">
        {FILTROS.map((f) => (
          <label
            key={f.valor}
            className="flex min-h-[48px] cursor-pointer items-center rounded-full border border-outline-variant px-space-md text-label-md text-on-surface-variant has-checked:border-primary-container has-checked:bg-primary-container has-checked:text-on-primary has-focus-visible:outline-2 has-focus-visible:outline-primary"
          >
            <input
              type="radio"
              name="estado-donaciones"
              value={f.valor}
              checked={filtro === f.valor}
              onChange={() => fijarFiltro(f.valor)}
              className="sr-only"
            />
            {f.texto}
          </label>
        ))}
      </div>

      {donaciones.isPending ? (
        <Esqueleto etiqueta="Cargando tus donaciones" className="h-40" />
      ) : donaciones.isError ? (
        <EstadoError mensaje={donaciones.error.message} alReintentar={() => donaciones.refetch()} />
      ) : donaciones.data.length === 0 ? (
        <EstadoVacio titulo="Todavía no preparas ninguna donación">
          Cuando prepares una, la verás aquí con su folio.
        </EstadoVacio>
      ) : (
        <ul className="flex flex-col gap-space-sm">
          {donaciones.data.map((d) => (
            <li
              key={d.folio}
              className="flex flex-col gap-space-xs rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
            >
              <div className="flex items-center justify-between gap-space-sm">
                <span className="font-mono text-label-md text-on-surface">{d.folio}</span>
                <span className="rounded-full bg-surface-container-high px-space-sm py-1 text-label-sm text-on-surface-variant">
                  {ESTADOS_DONACION[d.estado]}
                </span>
              </div>
              <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
                <Icono nombre="location_on" className="text-[18px]" />
                {d.acopio.nombre} · {haceCuanto(d.creadoEn)}
              </p>
              <p className="text-body-md text-on-surface">{resumen(d)}</p>
              <div className="flex gap-space-sm">
                {d.estado === 'PREPARADO' && (
                  <Link to={`/donar?folio=${d.folio}`} className={ENLACE_SECUNDARIO}>
                    <Icono nombre="qr_code_2" className="text-[20px]" />
                    Ver folio
                  </Link>
                )}
                <Link to={`/seguimiento/${d.folio}`} className={ENLACE_SECUNDARIO}>
                  Seguir
                </Link>
              </div>
              {d.estado === 'PREPARADO' && (
                <button
                  type="button"
                  onClick={() => fijarPorCancelar(d)}
                  className="min-h-[48px] self-start px-space-xs font-label-md text-label-md text-error"
                >
                  Cancelar donación
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {porCancelar && (
        <Hoja titulo="¿Cancelar esta donación?" alCerrar={cerrarHoja}>
          <p className="text-body-md text-on-surface-variant">
            La donación {porCancelar.folio} dejará de estar preparada y su folio ya no servirá en el
            acopio.
          </p>
          {cancelar.isError && (
            <p role="alert" className="text-body-sm text-error">
              {cancelar.error.message}
            </p>
          )}
          <Boton
            className="bg-error! text-on-error!"
            disabled={cancelar.isPending}
            onClick={() => cancelar.mutate(porCancelar.folio, { onSuccess: cerrarHoja })}
          >
            Sí, cancelar
          </Boton>
          <Boton variante="secundario" onClick={cerrarHoja}>
            No, conservarla
          </Boton>
        </Hoja>
      )}
    </section>
  );
}
