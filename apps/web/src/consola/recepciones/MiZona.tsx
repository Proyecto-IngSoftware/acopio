import { formatearCantidad, formatearNumero } from '@acopio/shared';
import { Link, useSearchParams } from 'react-router';
import { type CategoriaFicha, type FichaZona, useFichaZona } from '../../api/motor';
import { pendientesDeResolver, useRecepciones, useReportesZona } from '../../api/recepciones';
import { useUbicacionesMias } from '../../api/red';
import type { Remision } from '../../api/remisiones';
import { EnlaceBoton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { haceCuanto } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';
import { EscanearRemision } from './EscanearRemision';
import { resumenLineas } from './Recepciones';

const MAS_FALTA = 3;
const POR_RECIBIR = 3;
const AVISO =
  'flex gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface';
const ENLACE = 'flex min-h-[44px] items-center text-label-md text-primary-container';

/** Las de menor cobertura entre las que aún tienen déficit. */
export function lasQueMasFaltan(categorias: CategoriaFicha[]): CategoriaFicha[] {
  return categorias
    .filter((c) => c.deficit > 0)
    .sort(
      (a, b) =>
        (a.cobertura ?? Number.POSITIVE_INFINITY) - (b.cobertura ?? Number.POSITIVE_INFINITY),
    )
    .slice(0, MAS_FALTA);
}

/** «Mi zona», el inicio del Receptor. Diseño: docs/03-diseno/stitch/mi-zona. */
export function MiZona() {
  const enLinea = useEnLinea();
  const ubicaciones = useUbicacionesMias();
  const [params, fijarParams] = useSearchParams();

  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Mi zona" />
        <NecesitaRed titulo="Mi zona necesita conexión" acopioId="">
          Vuelve a abrirla cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }

  const zonas = ubicaciones.data?.filter((u) => u.tipo === 'ZONA') ?? [];
  const elegida = zonas.find((z) => z.id === params.get('zona')) ?? zonas[0];

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Mi zona" />
      {ubicaciones.isPending && <Esqueleto etiqueta="Cargando tus zonas" />}
      {ubicaciones.error && (
        <EstadoError
          mensaje={ubicaciones.error.message}
          alReintentar={() => void ubicaciones.refetch()}
        />
      )}
      {ubicaciones.data && !elegida && (
        <EstadoVacio titulo="Sin zona asignada" ilustracion="mapa">
          Todavía no tienes una zona asignada. Pídele al Administrador que te asigne una.
        </EstadoVacio>
      )}
      {zonas.length > 1 && elegida && (
        <Segmentado
          etiqueta="Zona"
          valor={elegida.id}
          alCambiar={(id) => fijarParams({ zona: id }, { replace: true })}
          opciones={zonas.map((z) => ({ valor: z.id, texto: z.nombre }))}
        />
      )}
      {elegida && <Zona key={elegida.id} zonaId={elegida.id} />}
    </div>
  );
}

function Zona({ zonaId }: { zonaId: string }) {
  const ficha = useFichaZona(zonaId);
  return (
    <>
      {ficha.isPending && <Esqueleto etiqueta="Cargando la zona" />}
      {ficha.error && (
        <EstadoError mensaje={ficha.error.message} alReintentar={() => void ficha.refetch()} />
      )}
      {ficha.data && <Cabecera ficha={ficha.data} />}
      <PorRecibir zonaId={zonaId} />
      {ficha.data && <LoQueMasFalta ficha={ficha.data} />}
      <TusReportes zonaId={zonaId} />
    </>
  );
}

function Cabecera({ ficha }: { ficha: FichaZona }) {
  const { zona } = ficha;
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-headline-md text-on-surface">{zona.nombre}</h2>
      <p className="text-body-md text-on-surface-variant">
        {zona.municipio} · {zona.emergencia.nombre}
      </p>
      <p className="text-body-sm text-on-surface-variant">
        {formatearNumero(zona.poblacionEstimada)} personas (estimado)
      </p>
    </div>
  );
}

/** Lo que viene a esta zona y los despachos generales, que cualquier zona del Receptor toma. */
function PorRecibir({ zonaId }: { zonaId: string }) {
  const consulta = useRecepciones();
  const remisiones = consulta.data?.filter((r) => !r.zona || r.zona.id === zonaId);
  const n = remisiones?.length ?? 0;
  return (
    <section
      aria-labelledby="por-recibir"
      className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-md"
    >
      <div className="flex items-baseline gap-space-sm">
        <h2 id="por-recibir" className="text-headline-sm text-on-surface">
          Por recibir
        </h2>
        {n > 0 && (
          <span className="ml-auto text-label-md font-bold text-primary-container">
            {n} en camino
          </span>
        )}
      </div>
      {consulta.isPending && <Esqueleto etiqueta="Cargando remisiones" />}
      {consulta.error && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {remisiones?.length === 0 && (
        <EstadoVacio titulo="Nada en camino" ilustracion="caja-folio">
          No hay remisiones en camino a tu zona.
        </EstadoVacio>
      )}
      {n > 0 && (
        <ul className="flex flex-col gap-space-xs">
          {remisiones?.slice(0, POR_RECIBIR).map((r) => (
            <li key={r.id}>
              <FilaRemision r={r} />
            </li>
          ))}
        </ul>
      )}
      <EscanearRemision />
      {n > 0 && (
        <Link to="/consola/recepciones" className={`${ENLACE} justify-center`}>
          Ver todas
        </Link>
      )}
    </section>
  );
}

function FilaRemision({ r }: { r: Remision }) {
  return (
    <Link
      to={`/consola/recepciones/${r.codigo}`}
      className="flex flex-col gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-space-sm active:bg-surface-container"
    >
      <span className="flex items-center gap-space-sm">
        <span className="font-mono text-body-md font-bold text-on-surface">{r.codigo}</span>
        {r.despachadaEn && (
          <span className="ml-auto text-body-sm text-on-surface-variant">
            {haceCuanto(r.despachadaEn)}
          </span>
        )}
      </span>
      <span className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
        <Icono nombre={r.zona ? 'local_shipping' : 'alt_route'} className="text-[18px]" />
        {r.zona ? `Desde ${r.acopio.nombre}` : 'Despacho general'}
      </span>
      <span className="text-body-md text-on-surface tabular-nums">{resumenLineas(r)}</span>
    </Link>
  );
}

function LoQueMasFalta({ ficha }: { ficha: FichaZona }) {
  const faltan = lasQueMasFaltan(ficha.categorias);
  return (
    <section aria-labelledby="mas-falta" className="flex flex-col gap-space-sm">
      <div className="flex items-baseline gap-space-sm">
        <h2 id="mas-falta" className="text-headline-sm text-on-surface">
          Lo que más falta
        </h2>
        <Link to={`/consola/zonas/${ficha.zona.id}`} className={`${ENLACE} ml-auto`}>
          Ver la ficha
        </Link>
      </div>
      {faltan.length === 0 ? (
        <p className={AVISO}>
          <Icono nombre="check_circle" className="text-[22px] text-primary-container" />
          Con lo recibido y lo que viene en camino se cubre lo que la zona necesita por ahora.
        </p>
      ) : (
        <div className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
          <ul className="flex flex-col divide-y divide-outline-variant">
            {faltan.map((c) => (
              <li key={c.categoriaId} className="flex flex-col gap-space-xs py-space-sm">
                <div className="flex items-baseline gap-space-sm">
                  <h3 className="text-body-md font-bold text-on-surface">{c.categoria}</h3>
                  <span className="ml-auto text-body-sm text-on-surface-variant tabular-nums">
                    {formatearNumero(c.recibido)} de {formatearCantidad(c.necesidad, c.unidad)}
                    {c.enCamino > 0 && ` · ${formatearNumero(c.enCamino)} en camino`}
                  </span>
                </div>
                <Barra c={c} />
              </li>
            ))}
          </ul>
          <p className="flex gap-space-md text-body-sm text-on-surface-variant" aria-hidden>
            <span className="flex items-center gap-space-xs">
              <i className="inline-block h-2 w-3 rounded-full bg-primary-container" />
              Recibido
            </span>
            <span className="flex items-center gap-space-xs">
              <i className="inline-block h-2 w-3 rounded-full bg-primary-fixed" />
              En camino
            </span>
          </p>
        </div>
      )}
    </section>
  );
}

const porcentaje = (parte: number, total: number) =>
  `${Math.min(100, Math.max(0, total > 0 ? (parte / total) * 100 : 0))}%`;

/** Dos tramos: lo recibido y, a continuación, lo que viene en camino. El texto ya lo dice. */
function Barra({ c }: { c: CategoriaFicha }) {
  const recibido = Math.min(c.recibido, c.necesidad);
  const enCamino = Math.min(c.enCamino, c.necesidad - recibido);
  return (
    <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-surface-container">
      <i
        className="h-full bg-primary-container"
        style={{ width: porcentaje(recibido, c.necesidad) }}
      />
      <i className="h-full bg-primary-fixed" style={{ width: porcentaje(enCamino, c.necesidad) }} />
    </div>
  );
}

function TusReportes({ zonaId }: { zonaId: string }) {
  const consulta = useReportesZona(zonaId);
  const abiertos = consulta.data
    ? pendientesDeResolver(consulta.data).sort((a, b) => b.reportadoEn.localeCompare(a.reportadoEn))
    : undefined;
  const reportar = `/consola/zonas/${zonaId}/reportar`;
  return (
    <section aria-labelledby="tus-reportes" className="flex flex-col gap-space-sm">
      <h2 id="tus-reportes" className="text-headline-sm text-on-surface">
        Tus reportes
      </h2>
      {consulta.isPending && <Esqueleto etiqueta="Cargando reportes" />}
      {consulta.error && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {abiertos?.length === 0 && (
        <p className="text-body-md text-on-surface-variant">
          No tienes reportes abiertos. Si algo falta, repórtalo y el motor lo tiene en cuenta.
        </p>
      )}
      {abiertos && abiertos.length > 0 && (
        <ul className="flex flex-col gap-space-xs">
          {abiertos.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
            >
              <div className="flex items-baseline justify-between gap-space-sm">
                <h3 className="text-body-md font-bold text-on-surface">{r.categoria}</h3>
                <span className="text-body-sm text-on-surface-variant">
                  {haceCuanto(r.reportadoEn)}
                </span>
              </div>
              {r.nota && <p className="text-body-md italic text-on-surface">«{r.nota}»</p>}
            </li>
          ))}
        </ul>
      )}
      <EnlaceBoton a={reportar} variante="secundario">
        <Icono nombre="campaign" className="text-[20px]" />
        Reportar necesidad
      </EnlaceBoton>
      {abiertos && abiertos.length > 0 && (
        <Link to={`${reportar}?modo=resuelta`} className={`${ENLACE} justify-center`}>
          Ya se resolvió algo
        </Link>
      )}
    </section>
  );
}
