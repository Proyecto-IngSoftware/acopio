import { formatearCantidad } from '@acopio/shared';
import { Link } from 'react-router';
import { useRecepciones } from '../../api/recepciones';
import type { Remision } from '../../api/remisiones';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';
import { haceCuanto } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';
import { EscanearRemision } from './EscanearRemision';

const SUBTITULO = 'Remisiones en camino a tus zonas';
const VOLVER = '/consola/mi-zona';

/** C13 Por recibir (RF-MOT-009). Diseño: docs/03-diseno/stitch/C13-recepcion. */
export function Recepciones() {
  const enLinea = useEnLinea();
  const consulta = useRecepciones();

  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Por recibir" subtitulo={SUBTITULO} volverA={VOLVER} />
        <NecesitaRed titulo="La recepción necesita conexión" acopioId="">
          Vuelve a abrirla cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Por recibir" subtitulo={SUBTITULO} volverA={VOLVER} />
      <EscanearRemision />

      {consulta.isPending && <Esqueleto etiqueta="Cargando remisiones" />}
      {consulta.error && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {consulta.data?.length === 0 && (
        <EstadoVacio ilustracion="caja-folio" titulo="Nada por recibir">
          No hay remisiones en camino a tus zonas. Cuando un acopio despache una, aparece aquí.
        </EstadoVacio>
      )}
      <ul className="flex flex-col gap-space-sm">
        {consulta.data?.map((r) => (
          <li key={r.id}>
            <Tarjeta r={r} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lo que trae una remisión en una línea: «Agua potable 400 L · Arroz 60 kg». */
export const resumenLineas = (r: Remision) =>
  r.lineas
    .map((l) => `${l.categoria} ${formatearCantidad(l.cantidadPlaneada, l.unidad)}`)
    .join(' · ');

function Tarjeta({ r }: { r: Remision }) {
  return (
    <Link
      to={`/consola/recepciones/${r.codigo}`}
      className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md active:bg-surface-container"
    >
      <span className="flex items-center gap-space-sm">
        <span className="font-mono text-body-lg font-bold text-on-surface">{r.codigo}</span>
        {r.despachadaEn && (
          <span className="ml-auto rounded-full bg-surface-container px-space-sm py-1 text-label-md text-on-surface">
            {haceCuanto(r.despachadaEn)}
          </span>
        )}
      </span>
      <span className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
        <Icono nombre="local_shipping" className="text-[18px]" />
        Desde {r.acopio.nombre}
      </span>
      <span className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
        <Icono nombre={r.zona ? 'location_on' : 'alt_route'} className="text-[18px]" />
        {r.zona ? `Para ${r.zona.nombre}` : 'Despacho general: eliges la zona al recibir'}
      </span>
      <span className="text-body-md text-on-surface tabular-nums">{resumenLineas(r)}</span>
    </Link>
  );
}
