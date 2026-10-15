import { Link, useParams } from 'react-router';
import { formatearCantidad } from '@acopio/shared';
import { urlRecepcion, useRemision, type Remision } from '../../api/remisiones';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Icono } from '../../componentes/Icono';
import { Qr } from '../../componentes/Qr';
import { diaLargo } from '../../formato';

/** C12: el documento de la remisión con su QR, para imprimir en carta (I2-02, I2-04). */
export function DocumentoRemision() {
  const { codigo = '' } = useParams();
  const consulta = useRemision(codigo);
  const r = consulta.data;
  const conDocumento = r?.estado === 'EN_TRANSITO' || r?.estado === 'RECIBIDA';

  return (
    <main className="mx-auto flex min-h-screen max-w-[760px] flex-col gap-space-md bg-surface-container-lowest px-margin py-space-lg print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-space-sm print:hidden">
        <Link
          to={`/consola/remisiones/${codigo}`}
          className="flex min-h-[44px] items-center gap-space-xs text-label-md text-primary-container"
        >
          <Icono nombre="arrow_back" className="text-[20px]" />
          Volver a la remisión
        </Link>
        {conDocumento && (
          <Boton variante="secundario" onClick={() => window.print()}>
            <Icono nombre="print" className="text-[20px]" />
            Imprimir
          </Boton>
        )}
      </div>

      <header className="flex flex-wrap items-start justify-between gap-space-sm border-b border-outline-variant pb-space-sm">
        <div className="flex flex-col">
          <span className="text-label-md text-primary-container">Acopio</span>
          <h1 className="text-headline-md text-on-surface">
            Remisión <span className="font-mono">{codigo}</span>
          </h1>
        </div>
        {r?.despachadaEn && (
          <span className="text-body-md text-on-surface-variant">
            Despachada el {diaLargo(r.despachadaEn)}
          </span>
        )}
      </header>

      {consulta.isPending && <Esqueleto etiqueta="Cargando la remisión" />}
      {consulta.error && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {consulta.data && !conDocumento && (
        <EstadoError
          mensaje="Esta remisión no tiene documento: se imprime al despacharla."
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {r && conDocumento && <Cuerpo r={r} />}
    </main>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-body-sm text-on-surface-variant">{etiqueta}</dt>
      <dd className="text-body-lg font-bold text-on-surface">{valor}</dd>
    </div>
  );
}

function Cuerpo({ r }: { r: Remision }) {
  return (
    <>
      <dl className="grid grid-cols-1 gap-space-sm sm:grid-cols-2 print:grid-cols-2">
        <Dato etiqueta="Acopio de origen" valor={r.acopio.nombre} />
        <Dato etiqueta="Destino" valor={r.zona?.nombre ?? 'Despacho general'} />
        <Dato etiqueta="Responsable" valor={r.responsable ?? ''} />
        {r.folios.length > 0 && <Dato etiqueta="Folios vinculados" valor={r.folios.join(', ')} />}
      </dl>

      <table className="w-full border-collapse tabular-nums">
        <thead>
          <tr className="border-b border-outline-variant text-left text-body-sm text-on-surface-variant">
            <th className="py-space-xs font-normal">Categoría</th>
            <th className="py-space-xs text-right font-normal">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {r.lineas.map((l) => (
            <tr key={l.categoriaId} className="border-b border-outline-variant">
              <td className="py-space-xs text-body-md text-on-surface">{l.categoria}</td>
              <td className="py-space-xs text-right text-body-md font-bold text-on-surface">
                {formatearCantidad(l.cantidadPlaneada, l.unidad)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="flex flex-wrap items-center gap-space-md break-inside-avoid">
        <Qr
          texto={urlRecepcion(r.qrToken)}
          alt={`Código QR para recibir la remisión ${r.codigo}`}
          className="h-32 w-32"
        />
        <div className="flex flex-col gap-space-xs">
          <b className="text-body-lg text-on-surface">Para recibir</b>
          <span className="text-body-sm text-on-surface-variant">
            Escanea el código con la cámara o con «Recibir» en Acopio.
          </span>
          <span className="font-mono text-headline-sm text-on-surface">{r.codigo}</span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-space-md sm:grid-cols-2 print:grid-cols-2 break-inside-avoid">
        {['Entrega', 'Recibe'].map((quien) => (
          <div
            key={quien}
            className="flex flex-col gap-space-md rounded-lg border border-outline-variant p-space-sm"
          >
            <b className="text-body-md text-on-surface">{quien}</b>
            {['Nombre', 'Documento', 'Firma'].map((campo) => (
              <span
                key={campo}
                className="border-b border-outline pb-1 pt-space-sm text-body-sm text-on-surface-variant"
              >
                {campo}
              </span>
            ))}
          </div>
        ))}
      </section>
    </>
  );
}
