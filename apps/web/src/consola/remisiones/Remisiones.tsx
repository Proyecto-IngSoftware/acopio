import { Link, useSearchParams } from 'react-router';
import {
  fechaDelEstado,
  useRemisiones,
  type EstadoRemision,
  type Remision,
} from '../../api/remisiones';
import { EnlaceBoton } from '../../componentes/Boton';
import { Selector } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';
import { retrasoEntrada } from '../../componentes/movimiento';
import { Pildora } from '../../componentes/Pildora';
import { haceCuanto } from '../../formato';
import { useSesion } from '../../sesion/Sesion';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';
import { EtiquetaRemision } from './EtiquetaRemision';

const ESTADOS: [EstadoRemision, string, string][] = [
  ['BORRADOR', 'Borradores', 'en borrador'],
  ['EN_TRANSITO', 'En tránsito', 'en tránsito'],
  ['RECIBIDA', 'Recibidas', 'recibidas'],
  ['CANCELADA', 'Canceladas', 'canceladas'],
];

/** Valor del selector de zona para las remisiones sin zona. */
const GENERAL = 'general';

/** C12 Remisiones: la lista por estado (RF-MOT-008). El filtro vive en la URL. */
export function Remisiones() {
  const enLinea = useEnLinea();
  const { usuario } = useSesion();
  const [params, fijarParams] = useSearchParams();
  const estado = (ESTADOS.find(([e]) => e === params.get('estado'))?.[0] ??
    'BORRADOR') as EstadoRemision;
  const zona = params.get('zona') ?? '';
  const consulta = useRemisiones({ estado });
  const subtitulo = usuario?.rol === 'ADMIN' ? 'Todos los acopios' : 'Traslados de tu acopio';

  function cambiar(clave: string, valor: string) {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    if (clave === 'estado') nuevos.delete('zona');
    fijarParams(nuevos, { replace: true });
  }

  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Remisiones" subtitulo={subtitulo} />
        <NecesitaRed titulo="Las remisiones necesitan conexión" acopioId="">
          Vuelve a abrirlas cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }

  const todas = consulta.data ?? [];
  const zonas = [
    ...new Map(todas.filter((r) => r.zona).map((r) => [r.zona!.id, r.zona!.nombre])),
  ].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  const hayGenerales = todas.some((r) => r.zona === null);
  const visibles = todas.filter((r) =>
    !zona ? true : zona === GENERAL ? r.zona === null : r.zona?.id === zona,
  );
  const nombreEstado = ESTADOS.find(([e]) => e === estado)![2];

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Remisiones" subtitulo={subtitulo} />
      <EnlaceBoton a="/consola/remisiones/nueva">
        <Icono nombre="add" className="text-[20px]" />
        Nueva remisión
      </EnlaceBoton>
      <div className="flex gap-space-xs overflow-x-auto" role="group" aria-label="Estado">
        {ESTADOS.map(([e, texto]) => (
          <Pildora
            key={e}
            activa={e === estado}
            texto={e === estado && consulta.data ? `${texto} ${todas.length}` : texto}
            alTocar={() => cambiar('estado', e === 'BORRADOR' ? '' : e)}
          />
        ))}
      </div>
      {(zonas.length > 0 || hayGenerales) && (
        <Selector
          id="filtro-zona"
          etiqueta="Zona"
          value={zona}
          onChange={(e) => cambiar('zona', e.target.value)}
        >
          <option value="">Todas</option>
          {hayGenerales && <option value={GENERAL}>Despacho general</option>}
          {zonas.map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </Selector>
      )}

      {consulta.isPending && <Esqueleto etiqueta="Cargando remisiones" />}
      {consulta.error && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {consulta.data && visibles.length === 0 && (
        <EstadoVacio ilustracion="caja-folio" titulo={`No hay remisiones ${nombreEstado}`}>
          {estado === 'BORRADOR'
            ? 'Aprueba sugerencias en el motor o crea una remisión a mano.'
            : 'Cuando haya, aparecen aquí.'}
        </EstadoVacio>
      )}
      <ul key={`${estado}-${zona}`} className="flex flex-col gap-space-sm">
        {visibles.map((r, i) => (
          <li key={r.id} className="entra-lista" style={retrasoEntrada(i)}>
            <Fila r={r} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fila({ r }: { r: Remision }) {
  const n = r.lineas.length;
  return (
    <Link
      to={`/consola/remisiones/${r.codigo}`}
      className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md active:bg-surface-container"
    >
      <span className="flex items-center gap-space-sm">
        <span className="font-mono text-body-lg font-bold text-on-surface">{r.codigo}</span>
        <span className="ml-auto">
          <EtiquetaRemision estado={r.estado} />
        </span>
      </span>
      <span className="flex items-center gap-space-xs text-body-md text-on-surface">
        <Icono
          nombre={r.zona ? 'local_shipping' : 'inventory_2'}
          className="text-[20px] text-primary-container"
        />
        {r.acopio.nombre} → {r.zona?.nombre ?? 'Despacho general'}
      </span>
      <span className="flex justify-between gap-space-sm text-body-sm text-on-surface-variant">
        <span>
          {n} {n === 1 ? 'categoría' : 'categorías'}
        </span>
        <span>{haceCuanto(fechaDelEstado(r))}</span>
      </span>
    </Link>
  );
}
