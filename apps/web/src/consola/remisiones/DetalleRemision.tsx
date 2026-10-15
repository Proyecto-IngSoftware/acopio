import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { formatearCantidad, formatearNumero, puedeRemision } from '@acopio/shared';
import { ErrorApi } from '../../api/cliente';
import {
  fechaDelEstado,
  urlEvidencia,
  useEditarRemision,
  useGuardarLineas,
  useRemision,
  type Remision,
} from '../../api/remisiones';
import { Boton, EnlaceBoton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Icono } from '../../componentes/Icono';
import { diaLargo, haceCuanto } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';
import { CamposDestino, type Destino } from './CamposDestino';
import { EditorLineas } from './EditorLineas';
import { EtiquetaRemision } from './EtiquetaRemision';
import { HojaCancelar } from './HojaCancelar';
import { HojaDespachar } from './HojaDespachar';

const conflicto = (e: unknown) => e instanceof ErrorApi && e.codigo === 'REMISION_ESTADO_INVALIDO';

/** C12: una remisión según su estado. Las acciones salen de TRANSICIONES_REMISION. */
export function DetalleRemision() {
  const { codigo = '' } = useParams();
  const enLinea = useEnLinea();
  const consulta = useRemision(codigo);
  const inicial = (useLocation().state as { aviso?: string } | null)?.aviso ?? null;
  const [aviso, fijarAviso] = useState<string | null>(inicial);
  const [cambio, fijarCambio] = useState(false);
  const [hoja, fijarHoja] = useState<'despachar' | 'cancelar' | null>(null);

  const encabezado = <Encabezado titulo={codigo} volverA="/consola/remisiones" />;
  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        {encabezado}
        <NecesitaRed titulo="Las remisiones necesitan conexión" acopioId="">
          Vuelve a abrirla cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }
  if (consulta.isPending) {
    return (
      <div className="flex flex-col gap-space-md">
        {encabezado}
        <Esqueleto etiqueta="Cargando la remisión" />
      </div>
    );
  }
  if (consulta.error) {
    return (
      <div className="flex flex-col gap-space-md">
        {encabezado}
        <EstadoError
          mensaje={
            consulta.error.estado === 404
              ? `No encontramos la remisión ${codigo}`
              : consulta.error.message
          }
          alReintentar={() => void consulta.refetch()}
        />
      </div>
    );
  }

  const r = consulta.data;
  const alConflicto = () => {
    fijarHoja(null);
    fijarCambio(true);
  };
  return (
    <div className="flex flex-col gap-space-md">
      {encabezado}
      <Cabecera r={r} />

      {aviso && (
        <p
          role="status"
          className="rounded-xl bg-surface-container-low p-space-sm text-body-md text-on-surface"
        >
          {aviso}
        </p>
      )}
      {cambio && (
        <div
          role="alert"
          className="flex flex-col gap-space-xs rounded-xl bg-error-container p-space-sm text-body-md text-on-error-container"
        >
          <span>La remisión cambió mientras la editabas</span>
          <Boton
            variante="secundario"
            onClick={() => {
              fijarCambio(false);
              void consulta.refetch();
            }}
          >
            Ver cómo quedó
          </Boton>
        </div>
      )}

      {puedeRemision(r.estado, 'editar') ? (
        <Borrador
          key={firma(r)}
          r={r}
          alConflicto={alConflicto}
          alGuardar={(texto) => fijarAviso(texto)}
        />
      ) : (
        <Lectura r={r} />
      )}

      {r.estado === 'EN_TRANSITO' && (
        <EnlaceBoton a={`/consola/remisiones/${r.codigo}/documento`}>
          Imprimir documento
        </EnlaceBoton>
      )}
      {puedeRemision(r.estado, 'despachar') && (
        <Boton onClick={() => fijarHoja('despachar')}>Despachar</Boton>
      )}
      {puedeRemision(r.estado, 'cancelar') && (
        <Boton variante="terciario" onClick={() => fijarHoja('cancelar')}>
          Cancelar remisión
        </Boton>
      )}

      {hoja === 'despachar' && (
        <HojaDespachar
          remision={r}
          alCerrar={() => fijarHoja(null)}
          alError={alConflicto}
          alDespachar={() => {
            fijarHoja(null);
            fijarAviso(`${r.codigo} va en camino`);
          }}
        />
      )}
      {hoja === 'cancelar' && (
        <HojaCancelar
          remision={r}
          alCerrar={() => fijarHoja(null)}
          alError={alConflicto}
          alCancelar={() => {
            fijarHoja(null);
            fijarAviso(`Se canceló ${r.codigo}`);
          }}
        />
      )}
    </div>
  );
}

/** Cambia cuando la API devuelve otras líneas o otro destino: el borrador se rearma. */
const firma = (r: Remision) =>
  JSON.stringify([
    r.zona?.id ?? null,
    r.responsable,
    r.lineas.map((l) => [l.categoriaId, l.cantidadPlaneada]),
  ]);

function Cabecera({ r }: { r: Remision }) {
  return (
    <div className="flex flex-col gap-space-xs">
      <div className="flex flex-wrap items-center gap-space-sm">
        <EtiquetaRemision estado={r.estado} />
        <span className="text-body-sm text-on-surface-variant">
          {haceCuanto(fechaDelEstado(r))}
        </span>
      </div>
      <p className="flex items-center gap-space-xs text-body-md font-bold text-on-surface">
        <Icono nombre="local_shipping" className="text-[20px] text-primary-container" />
        {r.acopio.nombre} → {r.zona?.nombre ?? 'Despacho general'}
      </p>
    </div>
  );
}

function Borrador({
  r,
  alConflicto,
  alGuardar,
}: {
  r: Remision;
  alConflicto: () => void;
  alGuardar: (aviso: string) => void;
}) {
  const editar = useEditarRemision(r.codigo);
  const lineas = useGuardarLineas(r.codigo);
  const [destino, fijarDestino] = useState<Destino>({
    acopioId: r.acopio.id,
    zonaId: r.zona?.id ?? null,
    responsable: r.responsable ?? '',
  });
  const alError = (e: ErrorApi) => {
    if (conflicto(e)) alConflicto();
  };
  return (
    <>
      <section className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
        <CamposDestino
          valor={destino}
          alCambiar={fijarDestino}
          conAcopio={false}
          error={editar.error}
        />
        <Boton
          variante="secundario"
          disabled={editar.isPending}
          onClick={() =>
            editar.mutate(
              { zonaId: destino.zonaId, responsable: destino.responsable.trim() || null },
              { onSuccess: () => alGuardar('Destino guardado'), onError: alError },
            )
          }
        >
          Guardar destino
        </Boton>
      </section>
      <section aria-labelledby="que-se-manda" className="flex flex-col gap-space-sm">
        <h2 id="que-se-manda" className="text-title-md text-on-surface">
          Qué se manda
        </h2>
        <EditorLineas
          acopioId={r.acopio.id}
          propias={r.lineas}
          error={lineas.error}
          etiqueta="Guardar líneas"
          ocupado={lineas.isPending}
          alGuardar={(nuevas) =>
            lineas.mutate(nuevas, {
              onSuccess: () => alGuardar('Líneas guardadas'),
              onError: alError,
            })
          }
        />
      </section>
    </>
  );
}

function Lectura({ r }: { r: Remision }) {
  return (
    <div className="flex flex-col gap-space-md">
      {r.responsable && (
        <p className="flex items-center gap-space-xs text-body-md text-on-surface">
          <Icono nombre="person" className="text-[20px] text-on-surface-variant" />
          {r.responsable}
        </p>
      )}
      {r.folios.length > 0 && (
        <p className="text-body-md text-on-surface">Folios: {r.folios.join(', ')}</p>
      )}
      <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
        {r.lineas.map((l) => (
          <li
            key={l.categoriaId}
            className="flex justify-between gap-space-sm p-space-sm tabular-nums"
          >
            <span className="text-body-md text-on-surface">{l.categoria}</span>
            {r.estado === 'RECIBIDA' && l.cantidadRecibida !== null ? (
              <span className="text-body-md text-on-surface">
                Planeado {formatearNumero(l.cantidadPlaneada)} · Recibido{' '}
                <b>{formatearCantidad(l.cantidadRecibida, l.unidad)}</b>
              </span>
            ) : (
              <b className="text-body-md text-on-surface">
                {formatearCantidad(l.cantidadPlaneada, l.unidad)}
              </b>
            )}
          </li>
        ))}
      </ul>
      {r.estado === 'RECIBIDA' && (
        <section className="flex flex-col gap-space-xs">
          <h2 className="text-title-md text-on-surface">Nota del Receptor</h2>
          <p className="text-body-md text-on-surface">
            {r.notaRecepcion ? `«${r.notaRecepcion}»` : 'Sin nota'}
          </p>
          <div className="flex flex-wrap gap-space-xs">
            {Array.from({ length: r.evidencias }, (_, n) => (
              <img
                key={n}
                src={urlEvidencia(r.codigo, n)}
                alt={`Foto ${n + 1} de la entrega`}
                className="h-24 w-24 rounded-lg border border-outline-variant object-cover"
              />
            ))}
          </div>
        </section>
      )}
      {r.estado === 'CANCELADA' && (
        <p className="text-body-md text-on-surface">
          Cancelada{r.canceladaEn ? ` el ${diaLargo(r.canceladaEn)}` : ''}: «{r.motivoCancelacion}»
        </p>
      )}
    </div>
  );
}
