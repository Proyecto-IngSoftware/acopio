import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useCategoriasVigentes } from '../../api/catalogo';
import { useNecesidades, type NecesidadAcopio } from '../../api/inventario';
import {
  useAcopiosPublicos,
  useGeocodificar,
  useZonasConNecesidad,
  type Punto,
  type ZonaPublica,
} from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Campo, Selector } from '../../componentes/Campo';
import { ChipsEstado } from '../../componentes/ChipsEstado';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
// Esta pantalla ya se descarga al abrirla (rutas.tsx); Leaflet viaja en su mismo fragmento
// y así se ahorra una ida y vuelta en 3G (I-02)
import MapaAcopios from './MapaAcopios';
import { Elegido } from './Elegido';
import { filtroDelMapa } from './filtro';
import {
  contarEstados,
  estadoDeCategoria,
  etiquetaAcopio,
  fraseCategoria,
  muestraEtiqueta,
  tieneEstado,
  type EstadoMapa,
  type EtiquetaMapa,
} from './necesidad';
import { PildoraEstado, TarjetaAcopio } from './TarjetaAcopio';
import { TarjetaZona } from './TarjetaZona';
import { ElegidoReferenciado, TarjetaReferenciado, esReferenciado } from './referenciado';

const SIN_ZONAS: ZonaPublica[] = [];

type Chip = 'todos' | Exclude<EstadoMapa, 'aldia'>;
const CHIPS: readonly Chip[] = ['falta', 'sobra', 'norecibe'];
const leerChip = (v: string | null): Chip => (CHIPS.includes(v as Chip) ? (v as Chip) : 'todos');

const LEYENDA: (EtiquetaMapa & { frase: string })[] = [
  { estado: 'falta', texto: 'FALTA', frase: 'le falta al menos una categoría' },
  { estado: 'sobra', texto: 'DE SOBRA', frase: 'tiene más de lo que necesita en alguna' },
  { estado: 'aldia', texto: 'AL DÍA', frase: 'todo está dentro de lo que necesita' },
  { estado: 'norecibe', texto: 'NO RECIBE', frase: 'hay algo que hoy no está recibiendo' },
];

/** P5 Mapa de acopios (RF-RED-002). Los filtros viven en la URL, así «Volver al mapa»
 *  los conserva. */
export function Mapa() {
  const [parametros, fijarParametros] = useSearchParams();
  const vista = parametros.get('vista') === 'lista' ? 'lista' : 'mapa';
  const { abiertoAhora: abierto, cerca } = filtroDelMapa(parametros);
  const lleva = parametros.get('lleva');
  const chipUrl = leerChip(parametros.get('estado'));
  const conReferenciados = parametros.get('redacopio') !== '0';
  const [elegido, fijarElegido] = useState<string | null>(null);
  const [zonaElegida, fijarZonaElegida] = useState<string | null>(null);
  // Elegir un acopio cierra la zona y al revés: debajo del mapa va una sola tarjeta
  const elegirAcopio = useCallback((id: string) => {
    fijarZonaElegida(null);
    fijarElegido(id);
  }, []);
  const elegirZona = useCallback((id: string) => {
    fijarElegido(null);
    fijarZonaElegida(id);
  }, []);

  const cambiar = (clave: string, valor: string | null) =>
    fijarParametros(
      (p) => {
        const nuevos = new URLSearchParams(p);
        if (valor === null) nuevos.delete(clave);
        else nuevos.set(clave, valor);
        return nuevos;
      },
      { replace: true },
    );

  const acopios = useAcopiosPublicos({ abiertoAhora: abierto, cerca });
  const categorias = useCategoriasVigentes();
  const categoria = categorias.data?.find((c) => c.id === lleva);
  // Las etiquetas y los chips son un extra: si la consulta falla, el mapa sigue como antes
  const necesidades = useNecesidades().data;
  const porId = useMemo(
    () => new Map<string, NecesidadAcopio>((necesidades ?? []).map((n) => [n.acopioId, n])),
    [necesidades],
  );
  // Con categoría, «No recibe» no es chip: esos acopios ya se ven apagados
  const chip = !necesidades || (categoria && chipUrl === 'norecibe') ? 'todos' : chipUrl;
  const operados = useMemo(
    () => (acopios.data ?? []).filter((a) => !esReferenciado(a)),
    [acopios.data],
  );
  const cuentas = useMemo(
    () => contarEstados(operados, porId, categoria?.id),
    [operados, porId, categoria?.id],
  );
  const noLaReciben = useMemo(
    () =>
      new Set(
        categoria
          ? operados
              .filter(
                (a) =>
                  muestraEtiqueta(a) &&
                  estadoDeCategoria(porId.get(a.id), categoria.id) === 'norecibe',
              )
              .map((a) => a.id)
          : [],
      ),
    [operados, porId, categoria],
  );
  // Memorizado: un arreglo nuevo en cada render volvería a encuadrar el mapa al elegir algo.
  // Los que no reciben la categoría van al final, apagados
  const visibles = useMemo(() => {
    const conChip =
      chip === 'todos'
        ? operados
        : operados.filter((a) => {
            if (!muestraEtiqueta(a)) return false;
            const n = porId.get(a.id);
            return categoria ? estadoDeCategoria(n, categoria.id) === chip : tieneEstado(n, chip);
          });
    return [
      ...conChip.filter((a) => !noLaReciben.has(a.id)),
      ...conChip.filter((a) => noLaReciben.has(a.id)),
    ];
  }, [operados, porId, categoria, chip, noLaReciben]);
  const etiquetas = useMemo(() => {
    const mapa = new Map<string, EtiquetaMapa>();
    for (const a of visibles) {
      const e = etiquetaAcopio(a, porId.get(a.id), {
        categoria,
        estado: chip === 'todos' ? undefined : chip,
      });
      if (e) mapa.set(a.id, e);
    }
    return mapa;
  }, [visibles, porId, categoria, chip]);
  // Un punto de RedAcopio no dice qué recibe ni qué le falta: con un chip elegido no se dibuja
  const referenciados = useMemo(
    () => (conReferenciados && chip === 'todos' ? (acopios.data ?? []).filter(esReferenciado) : []),
    [acopios.data, conReferenciados, chip],
  );
  const fuente = (acopios.data ?? []).find(esReferenciado)?.fuente;
  // En el mapa no se dibuja un punto cerrado; en la lista sí sale, con su estado
  const enMapa = useMemo(
    () => [...visibles, ...referenciados.filter((r) => r.estado !== 'CERRADO')],
    [visibles, referenciados],
  );
  const refsEnMapa = enMapa.length - visibles.length;
  const sufijo = cerca ? `?cerca=${encodeURIComponent(`${cerca.lat},${cerca.lng}`)}` : '';
  const seleccionado = enMapa.find((a) => a.id === elegido);
  // La capa de zonas es un extra: si falla, el mapa de acopios sigue igual
  const zonas = useZonasConNecesidad().data ?? SIN_ZONAS;
  const zona = zonas.find((z) => z.zonaId === zonaElegida);

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <div className="flex flex-col gap-space-xs">
        <h1 className="text-headline-lg-mobile tracking-tight text-on-surface">Mapa de acopios</h1>
        <p className="text-body-md text-on-surface-variant">
          Antes de salir, revisa qué falta y qué no reciben.
        </p>
      </div>

      <Ubicarme alUbicar={(p) => cambiar('cerca', `${p.lat},${p.lng}`)} />

      <div className="flex flex-col gap-space-sm">
        <button
          type="button"
          aria-pressed={abierto}
          onClick={() => cambiar('abierto', abierto ? null : '1')}
          className="flex min-h-[48px] w-fit items-center gap-space-xs rounded-full border border-outline-variant bg-surface-container-lowest px-space-md text-label-md text-on-surface aria-pressed:border-primary-container aria-pressed:bg-primary-container aria-pressed:text-on-primary"
        >
          <Icono nombre={abierto ? 'check' : 'schedule'} className="text-[18px]" />
          Abierto ahora
        </button>
        <Selector
          id="mapa-lleva"
          etiqueta="¿Qué vas a llevar?"
          value={lleva ?? ''}
          onChange={(e) => cambiar('lleva', e.target.value || null)}
        >
          <option value="">Cualquier cosa</option>
          {categorias.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Selector>
        {categoria && necesidades && (
          <p className="text-body-md text-on-surface">
            {fraseCategoria(categoria.nombre, cuentas)}
          </p>
        )}
        {categoria && noLaReciben.size > 0 && (
          <p className="flex items-start gap-space-xs text-body-sm text-on-surface-variant">
            <Icono nombre="block" className="text-[18px]" />
            {noLaReciben.size} {noLaReciben.size === 1 ? 'acopio no recibe' : 'acopios no reciben'}{' '}
            {categoria.nombre.toLocaleLowerCase('es-CO')}.
          </p>
        )}
        {necesidades && cuentas.todos > 0 && (
          <ChipsEstado
            etiqueta="Ver por estado"
            valor={chip}
            alCambiar={(v) => cambiar('estado', v === 'todos' ? null : v)}
            opciones={[
              { valor: 'todos', texto: 'Todos', cuenta: cuentas.todos },
              {
                valor: 'falta',
                texto: 'Falta',
                cuenta: cuentas.falta,
                punto: 'bg-secondary-container',
              },
              {
                valor: 'sobra',
                texto: 'De sobra',
                cuenta: cuentas.sobra,
                punto: 'bg-tertiary-container',
              },
              ...(categoria
                ? []
                : [
                    {
                      valor: 'norecibe' as const,
                      texto: 'No recibe',
                      cuenta: cuentas.norecibe,
                      punto: 'bg-on-surface-variant',
                    },
                  ]),
            ]}
          />
        )}
        {fuente && (
          <label className="flex min-h-[48px] w-fit items-center gap-space-sm text-body-md text-on-surface">
            <input
              type="checkbox"
              checked={conReferenciados}
              onChange={() => cambiar('redacopio', conReferenciados ? '0' : null)}
              className="size-5 accent-primary-container"
            />
            Mostrar puntos de {fuente.nombreCorto}
          </label>
        )}
        {lleva && referenciados.length > 0 && fuente && (
          <p className="text-body-sm text-on-surface-variant">
            «¿Qué vas a llevar?» solo filtra los acopios; los puntos de {fuente.nombreCorto} no
            dicen qué reciben por categoría.
          </p>
        )}
      </div>

      <Segmentado
        etiqueta="Ver como"
        valor={vista}
        alCambiar={(v) => cambiar('vista', v === 'lista' ? 'lista' : null)}
        opciones={[
          { valor: 'mapa', texto: 'Mapa', icono: 'map' },
          { valor: 'lista', texto: 'Lista', icono: 'list' },
        ]}
      />

      {acopios.isPending && <Esqueleto etiqueta="Cargando acopios" className="h-64" />}
      {acopios.error && (
        <EstadoError mensaje={acopios.error.message} alReintentar={() => void acopios.refetch()} />
      )}
      {acopios.data && visibles.length === 0 && referenciados.length === 0 && (
        <EstadoVacio titulo="Ningún acopio con esos filtros">
          Quita algún filtro para ver más acopios.
        </EstadoVacio>
      )}

      {acopios.data && vista === 'mapa' && enMapa.length > 0 && (
        <>
          <div className="isolate h-[55vh] min-h-72 overflow-hidden rounded-xl border border-outline-variant">
            <MapaAcopios
              acopios={enMapa}
              cerca={cerca}
              elegido={elegido}
              alElegir={elegirAcopio}
              zonas={zonas}
              zonaElegida={zonaElegida}
              alElegirZona={elegirZona}
              etiquetas={etiquetas}
              apagados={noLaReciben}
            />
          </div>
          {necesidades && (
            <ul aria-label="Estados del inventario" className="flex flex-col gap-space-xs">
              {LEYENDA.map((e) => (
                <li
                  key={e.estado}
                  className="flex items-center gap-space-xs text-body-sm text-on-surface-variant"
                >
                  <PildoraEstado etiqueta={e} mini /> {e.frase}
                </li>
              ))}
            </ul>
          )}
          {(zonas.length > 0 || refsEnMapa > 0) && (
            <div className="flex flex-col gap-space-xs">
              <p className="flex flex-wrap gap-x-space-md gap-y-space-xs text-body-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-space-xs">
                  <span className="size-4 rounded-full border-2 border-surface-container-lowest bg-primary-container shadow-sm" />
                  {refsEnMapa > 0 ? 'Acopio sin etiqueta: no publica su inventario' : 'Acopio'}
                </span>
                {refsEnMapa > 0 && fuente && (
                  <span className="inline-flex items-center gap-space-xs">
                    <span className="size-4 rounded-full border-2 border-primary-container bg-surface-container-lowest shadow-sm" />
                    {fuente.nombre}: datos de su fuente
                  </span>
                )}
                {zonas.length > 0 && (
                  <span className="inline-flex items-center gap-space-xs">
                    <span className="size-4 rounded-full border-2 border-dashed border-primary-container bg-primary-fixed/45" />
                    Zona con necesidad reportada
                  </span>
                )}
              </p>
              {zonas.length > 0 && !zona && (
                <p className="text-body-sm text-on-surface-variant">
                  Toca una zona para ver qué falta.
                </p>
              )}
            </div>
          )}
          {seleccionado &&
            (esReferenciado(seleccionado) ? (
              <ElegidoReferenciado
                punto={seleccionado}
                enlace={`/acopios/${seleccionado.id}${sufijo}`}
              />
            ) : (
              <Elegido
                acopio={seleccionado}
                enlace={`/acopios/${seleccionado.id}${sufijo}`}
                necesidad={porId.get(seleccionado.id)}
                categoria={categoria}
              />
            ))}
          {zona && (
            <TarjetaZona
              zona={zona}
              etiqueta="Zona con necesidad"
              alCerrar={() => fijarZonaElegida(null)}
            />
          )}
        </>
      )}

      {vista === 'lista' && zonas.length > 0 && (
        <section aria-labelledby="zonas-titulo" className="flex flex-col gap-space-sm">
          <h2
            id="zonas-titulo"
            className="text-label-md tracking-wide text-on-surface-variant uppercase"
          >
            Lo que falta en zonas afectadas
          </h2>
          <ul className="flex flex-col gap-space-sm">
            {zonas.map((z) => (
              <li key={z.zonaId}>
                <TarjetaZona zona={z} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {acopios.data && vista === 'lista' && (
        <>
          {referenciados.length > 0 && visibles.length > 0 && (
            <h2 className="text-label-md tracking-wide text-on-surface-variant uppercase">
              Acopios
            </h2>
          )}
          <ul className="flex flex-col gap-space-sm">
            {visibles.map((a) => (
              <li key={a.id}>
                <TarjetaAcopio
                  acopio={a}
                  enlace={`/acopios/${a.id}${sufijo}`}
                  etiqueta={noLaReciben.has(a.id) ? null : etiquetas.get(a.id)}
                  noRecibe={noLaReciben.has(a.id) ? categoria?.nombre : undefined}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {acopios.data && vista === 'lista' && referenciados.length > 0 && fuente && (
        <section aria-labelledby="referenciados-titulo" className="flex flex-col gap-space-sm">
          <h2
            id="referenciados-titulo"
            className="text-label-md tracking-wide text-on-surface-variant uppercase"
          >
            Puntos de {fuente.nombre}
          </h2>
          <ul className="flex flex-col gap-space-sm">
            {referenciados.map((r) => (
              <li key={r.id}>
                <TarjetaReferenciado punto={r} enlace={`/acopios/${r.id}${sufijo}`} />
              </li>
            ))}
          </ul>
          <p className="text-body-sm text-on-surface-variant">
            Datos de{' '}
            {fuente.url ? (
              <a
                href={fuente.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-container underline"
              >
                {fuente.nombre}
              </a>
            ) : (
              fuente.nombre
            )}
            , la red de puntos de acopio que mantiene la comunidad.
          </p>
        </section>
      )}
    </div>
  );
}

/** «Cerca de mí» con el permiso de ubicación, o una dirección (RF-RED-002). */
function Ubicarme({ alUbicar }: { alUbicar: (p: Punto) => void }) {
  const [q, fijarQ] = useState('');
  const [aviso, fijarAviso] = useState<string | null>(null);
  const buscar = useGeocodificar();

  function cercaDeMi() {
    if (!navigator.geolocation) {
      fijarAviso('Tu navegador no comparte la ubicación. Busca una dirección.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        fijarAviso(null);
        alUbicar({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => fijarAviso('No pudimos usar tu ubicación. Busca una dirección.'),
    );
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 3) buscar.mutate(q.trim());
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <form onSubmit={enviar} className="flex items-end gap-space-sm">
        <div className="min-w-0 flex-1">
          <Campo
            id="mapa-direccion"
            etiqueta="Buscar una dirección"
            value={q}
            onChange={(e) => fijarQ(e.target.value)}
          />
        </div>
        <Boton type="submit" variante="secundario" disabled={buscar.isPending}>
          Buscar
        </Boton>
      </form>
      <Boton variante="secundario" onClick={cercaDeMi} className="w-full">
        <Icono nombre="my_location" className="text-[20px]" />
        Cerca de mí
      </Boton>
      {(aviso ?? buscar.error?.message) && (
        <p role="alert" className="text-body-sm text-error">
          {aviso ?? buscar.error?.message}
        </p>
      )}
      {buscar.data && buscar.data.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">No encontramos esa dirección.</p>
      )}
      {buscar.data && buscar.data.length > 0 && (
        <ul className="flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
          {buscar.data.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                onClick={() => {
                  alUbicar({ lat: r.lat, lng: r.lng });
                  buscar.reset();
                }}
                className="flex min-h-[48px] w-full items-center gap-space-sm px-space-md py-space-xs text-left text-body-sm text-on-surface"
              >
                <Icono nombre="location_on" className="text-[20px] text-primary-container" />
                {r.etiqueta}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
