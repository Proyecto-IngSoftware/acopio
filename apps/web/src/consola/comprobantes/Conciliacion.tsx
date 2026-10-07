import { formatearCantidad, type UnidadBase } from '@acopio/shared';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import {
  enBase,
  MOTIVOS_RECHAZO,
  motivoDe,
  notaDe,
  useConciliacion,
  useConciliar,
  useRevertirRechazo,
  type Conciliacion as Detalle,
} from '../../api/comprobantes';
import { ESTADOS_DONACION, useUrlFactura } from '../../api/donaciones';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { diaLargo, fechaHora } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';
import { HojaRechazo } from './HojaRechazo';
import { HojaVincular } from './HojaVincular';

interface FilaCategoria {
  categoriaId: string;
  categoria: string;
  unidad: UnidadBase;
  declarado: number;
  llego: number | null;
  entradas: number;
  notas: string[];
  noLlego: boolean;
}

/** Suma por categoría, en unidad base: lo declarado y lo confirmado salen de las líneas. */
function porCategoria(d: Detalle): FilaCategoria[] {
  const filas = new Map<string, FilaCategoria>();
  const fila = (categoriaId: string, categoria: string, unidad: string) => {
    let f = filas.get(categoriaId);
    if (!f) {
      f = {
        categoriaId,
        categoria,
        unidad: unidad as UnidadBase,
        declarado: 0,
        llego: null,
        entradas: 0,
        notas: [],
        noLlego: false,
      };
      filas.set(categoriaId, f);
    }
    return f;
  };
  for (const l of d.lineas) {
    const f = fila(l.categoriaId, l.categoria, l.unidad);
    f.declarado += enBase(l.cantidadDeclarada, l.contenidoUnitario);
    if (l.cantidadConfirmada !== null) {
      f.llego = (f.llego ?? 0) + enBase(l.cantidadConfirmada, l.contenidoUnitario);
      if (l.cantidadConfirmada === 0) f.noLlego = true;
    }
    if (l.motivoDiferencia) f.notas.push(l.motivoDiferencia);
  }
  for (const r of d.resumen) fila(r.categoriaId, r.categoria, r.unidad).entradas = r.entradas;
  return [...filas.values()];
}

/** Conciliación de un comprobante (RF-CMP-004 y 005). Diseño: docs/03-diseno/stitch/C08-conciliacion. */
export function Conciliacion() {
  const { folio: param } = useParams();
  const folio = param!;
  // C8 manda su filtro para que «Volver» lo conserve
  const desde = (useLocation().state as { desde?: string } | null)?.desde ?? '';
  const bandeja = `/consola/comprobantes${desde}`;
  const enLinea = useEnLinea();
  const detalle = useConciliacion(folio);
  const conciliar = useConciliar(folio);
  const revertir = useRevertirRechazo(folio);
  const [rechazando, setRechazando] = useState(false);
  const [viendoFactura, setViendoFactura] = useState(false);
  const [vinculando, setVinculando] = useState(false);

  const marco = (contenido: React.ReactNode) => (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado titulo={folio} volverA={bandeja} />
      {contenido}
    </div>
  );

  if (!enLinea || detalle.error?.estado === 0) {
    return marco(
      <NecesitaRed titulo="La conciliación necesita conexión" acopioId="">
        Vuelve a abrirla cuando haya señal.
      </NecesitaRed>,
    );
  }
  if (detalle.error?.estado === 403 || detalle.error?.estado === 404) {
    return marco(
      <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md">
        <p className="text-body-md text-on-surface">
          {detalle.error.estado === 404 ? 'No encontramos ese folio' : detalle.error.message}
        </p>
        <Link to={bandeja} className="text-label-md text-primary-container">
          Volver a comprobantes
        </Link>
      </div>,
    );
  }
  if (detalle.error) {
    return marco(
      <EstadoError mensaje={detalle.error.message} alReintentar={() => void detalle.refetch()} />,
    );
  }
  if (detalle.isPending) return marco(<Esqueleto etiqueta="Cargando el comprobante" />);

  const d = detalle.data;
  const filas = porCategoria(d);
  const abierto = d.estado === 'PENDIENTE' || d.estado === 'PREPARADO';
  const sinRecibir = d.estado === 'PREPARADO' && d.entradas.length === 0;
  const errorConciliar = conciliar.error;
  const motivo = motivoDe(d);
  const nota = notaDe(d);

  return marco(
    <>
      <section
        aria-label="Comprobante"
        className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
      >
        <div className="flex flex-wrap items-center gap-space-sm">
          <span className="font-mono text-body-lg font-bold whitespace-nowrap">{d.folio}</span>
          <span className="ml-auto rounded-full bg-surface-container px-space-sm py-1 text-label-md">
            {ESTADOS_DONACION[d.estado]}
          </span>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          {d.acopio.nombre} · preparada el {diaLargo(d.creadoEn)}
          {d.recibidoEn && ` · recibida el ${diaLargo(d.recibidoEn)}`}
        </p>
        {d.tieneFactura && (
          <button
            type="button"
            onClick={() => setViendoFactura(true)}
            className="flex min-h-[48px] items-center gap-space-sm text-label-md text-primary-container"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant">
              <Icono nombre="receipt_long" className="text-[22px]" />
            </span>
            Ver factura
          </button>
        )}
      </section>

      <section className="flex flex-col gap-space-sm">
        <h2 id="titulo-categorias" className="text-headline-sm text-on-surface">
          Por categoría
        </h2>
        <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table aria-labelledby="titulo-categorias" className="w-full text-body-md tabular-nums">
            <thead>
              <tr className="text-left text-label-md text-on-surface-variant">
                <th scope="col" className="p-space-sm">
                  Categoría
                </th>
                <th scope="col" className="p-space-sm text-right">
                  Declaró
                </th>
                <th scope="col" className="p-space-sm text-right">
                  Llegó
                </th>
                <th scope="col" className="p-space-sm text-right">
                  Entradas
                </th>
              </tr>
            </thead>
            {filas.map((f) => (
              <tbody key={f.categoriaId} className="border-t border-outline-variant">
                <tr>
                  <th scope="row" className="p-space-sm text-left font-bold text-on-surface">
                    {f.categoria}
                  </th>
                  <td className="p-space-sm text-right">
                    {formatearCantidad(f.declarado, f.unidad)}
                  </td>
                  <td
                    className={`p-space-sm text-right ${f.llego !== null && f.llego !== f.declarado ? 'font-bold' : ''}`}
                  >
                    {f.llego === null ? '—' : formatearCantidad(f.llego, f.unidad)}
                  </td>
                  <td className="p-space-sm text-right">
                    {formatearCantidad(f.entradas, f.unidad)}
                  </td>
                </tr>
                {(f.notas.length > 0 || f.noLlego) && (
                  <tr>
                    <td colSpan={4} className="px-space-sm pb-space-sm">
                      <span className="flex flex-col gap-1 text-body-sm text-on-surface-variant">
                        {f.notas.map((n) => (
                          <span key={n} className="flex items-center gap-space-xs">
                            <Icono nombre="difference" className="text-[18px]" />
                            {n}
                          </span>
                        ))}
                        {f.noLlego && (
                          <span className="flex items-center gap-space-xs">
                            <Icono nombre="block" className="text-[18px]" />
                            No llegó
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-space-sm">
        <h2 id="titulo-entradas" className="text-headline-sm text-on-surface">
          Entradas vinculadas ({d.entradas.length})
        </h2>
        {d.entradas.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">
            Todavía no hay entradas vinculadas.
          </p>
        ) : (
          <ul
            aria-label="Entradas vinculadas"
            className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest"
          >
            {d.entradas.map((e) => (
              <li
                key={e.movimientoId}
                className="flex flex-col border-t border-outline-variant p-space-sm first:border-t-0"
              >
                <span className="text-body-md text-on-surface">
                  {e.categoria} · {formatearCantidad(e.cantidad, e.unidad as UnidadBase)}
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  {fechaHora(e.ocurridoEn)} · {e.registradoPor} ·{' '}
                  {e.origen === 'RECEPCION' ? 'Recepción' : 'Auditor'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sinRecibir && (
        <p className="flex gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface">
          <Icono nombre="info" className="text-[22px] text-on-surface-variant" />
          Este folio aún no se recibe. Si se entregó sin red, vincula sus entradas.
        </p>
      )}

      {abierto && (
        <div className="flex flex-col gap-space-sm">
          <Boton variante="secundario" onClick={() => setVinculando(true)}>
            <Icono nombre="link" className="text-[22px]" />
            Vincular entradas
          </Boton>
          {errorConciliar && (
            <div
              role="alert"
              className="flex flex-col gap-space-sm rounded-xl bg-error-container p-space-sm text-on-error-container"
            >
              <p>{errorConciliar.message}</p>
              {errorConciliar.codigo === 'SIN_VINCULOS' && (
                <Boton variante="secundario" onClick={() => setVinculando(true)}>
                  Vincular entradas
                </Boton>
              )}
            </div>
          )}
          {!sinRecibir && (
            <>
              <Boton
                className="min-h-[56px]"
                disabled={conciliar.isPending}
                onClick={() => conciliar.mutate()}
              >
                <Icono nombre="done_all" className="text-[22px]" />
                Conciliar
              </Boton>
              <button
                type="button"
                onClick={() => setRechazando(true)}
                className="min-h-[48px] text-label-md text-primary-container"
              >
                Rechazar
              </button>
            </>
          )}
        </div>
      )}

      {d.estado === 'RECHAZADO' && (
        <section
          aria-label="Rechazo"
          className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-md"
        >
          {motivo && <p className="font-bold text-on-surface">{MOTIVOS_RECHAZO[motivo]}</p>}
          {nota && <p className="text-body-md text-on-surface-variant">{nota}</p>}
          {revertir.error && (
            <p role="alert" className="text-body-sm text-error">
              {revertir.error.message}
            </p>
          )}
          <Boton
            variante="secundario"
            disabled={revertir.isPending}
            onClick={() => revertir.mutate()}
          >
            Revertir rechazo
          </Boton>
        </section>
      )}

      {d.estado === 'CONCILIADO' && d.verificadoEn && (
        <p className="flex items-center gap-space-sm text-body-md text-on-surface">
          <Icono nombre="done_all" className="text-[22px] text-primary-container" />
          Conciliada el {diaLargo(d.verificadoEn)}
        </p>
      )}

      {rechazando && <HojaRechazo folio={folio} alCerrar={() => setRechazando(false)} />}
      {vinculando && (
        <HojaVincular
          folio={folio}
          acopio={d.acopio}
          alCerrar={() => {
            setVinculando(false);
            conciliar.reset();
          }}
        />
      )}
      {viendoFactura && <VerFactura folio={folio} alCerrar={() => setViendoFactura(false)} />}
    </>,
  );
}

/** La URL firmada vence a los 5 minutos: se pide al abrir. */
function VerFactura({ folio, alCerrar }: { folio: string; alCerrar: () => void }) {
  const factura = useUrlFactura(folio, true);
  return (
    <Hoja titulo="Factura" alCerrar={alCerrar}>
      {factura.data ? (
        <img
          src={factura.data.url}
          alt={`Factura de ${folio}`}
          className="w-full rounded-lg border border-outline-variant"
        />
      ) : factura.error ? (
        <p role="alert" className="text-body-md text-error">
          {factura.error.message}
        </p>
      ) : (
        <Esqueleto etiqueta="Cargando la factura" className="h-64" />
      )}
    </Hoja>
  );
}
