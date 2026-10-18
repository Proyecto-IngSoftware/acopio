import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useCategoriasVigentes } from '../../api/catalogo';
import {
  useAcopiosPublicos,
  useAcopiosQueNoReciben,
  useGeocodificar,
  useNoRecibir,
  useZonasConNecesidad,
  type AcopioPublico,
  type Punto,
  type ZonaPublica,
} from '../../api/red';
import { Boton, EnlaceBoton } from '../../componentes/Boton';
import { Campo, Selector } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
// Esta pantalla ya se descarga al abrirla (rutas.tsx); Leaflet viaja en su mismo fragmento
// y así se ahorra una ida y vuelta en 3G (I-02)
import MapaAcopios from './MapaAcopios';
import { filtroDelMapa } from './filtro';
import { TarjetaAcopio, aperturaPublica, km } from './TarjetaAcopio';
import { TarjetaZona } from './TarjetaZona';
import { useLlevarALaVista } from './llevarALaVista';

const SIN_ZONAS: ZonaPublica[] = [];

/** P5 Mapa de acopios (RF-RED-002). Los filtros viven en la URL, así «Volver al mapa»
 *  los conserva. */
export function Mapa() {
  const [parametros, fijarParametros] = useSearchParams();
  const vista = parametros.get('vista') === 'lista' ? 'lista' : 'mapa';
  const { abiertoAhora: abierto, cerca } = filtroDelMapa(parametros);
  const lleva = parametros.get('lleva');
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
  const noReciben = useAcopiosQueNoReciben(lleva);
  const categoria = categorias.data?.find((c) => c.id === lleva);
  const ocultos = (acopios.data ?? []).filter((a) => noReciben.data?.has(a.id)).length;
  // Memorizado: un arreglo nuevo en cada render volvería a encuadrar el mapa al elegir algo
  const visibles = useMemo(
    () => (acopios.data ?? []).filter((a) => !noReciben.data?.has(a.id)),
    [acopios.data, noReciben.data],
  );
  const sufijo = cerca ? `?cerca=${encodeURIComponent(`${cerca.lat},${cerca.lng}`)}` : '';
  const seleccionado = visibles.find((a) => a.id === elegido);
  // La capa de zonas es un extra: si falla, el mapa de acopios sigue igual
  const zonas = useZonasConNecesidad().data ?? SIN_ZONAS;
  const zona = zonas.find((z) => z.zonaId === zonaElegida);

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <div className="flex flex-col gap-space-xs">
        <h1 className="text-headline-lg-mobile tracking-tight text-on-surface">Mapa de acopios</h1>
        <p className="text-body-md text-on-surface-variant">
          Antes de salir, revisa qué no reciben.
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
        {categoria && noReciben.data && ocultos > 0 && (
          <p className="flex items-start gap-space-xs text-body-sm text-on-surface-variant">
            <Icono nombre="block" className="text-[18px]" />
            Ocultamos {ocultos}{' '}
            {ocultos === 1 ? 'acopio que hoy no recibe' : 'acopios que hoy no reciben'}{' '}
            {categoria.nombre.toLocaleLowerCase('es-CO')}.
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
      {acopios.data && visibles.length === 0 && (
        <EstadoVacio titulo="Ningún acopio con esos filtros">
          Quita algún filtro para ver más acopios.
        </EstadoVacio>
      )}

      {acopios.data && vista === 'mapa' && visibles.length > 0 && (
        <>
          <div className="isolate h-[55vh] min-h-72 overflow-hidden rounded-xl border border-outline-variant">
            <MapaAcopios
              acopios={visibles}
              cerca={cerca}
              elegido={elegido}
              alElegir={elegirAcopio}
              zonas={zonas}
              zonaElegida={zonaElegida}
              alElegirZona={elegirZona}
            />
          </div>
          {zonas.length > 0 && (
            <div className="flex flex-col gap-space-xs">
              <p className="flex flex-wrap gap-x-space-md gap-y-space-xs text-body-sm text-on-surface-variant">
                <span className="inline-flex items-center gap-space-xs">
                  <span className="size-4 rounded-full border-2 border-surface-container-lowest bg-primary-container shadow-sm" />
                  Acopio
                </span>
                <span className="inline-flex items-center gap-space-xs">
                  <span className="size-4 rounded-full border-2 border-dashed border-primary-container bg-primary-fixed/45" />
                  Zona con necesidad reportada
                </span>
              </p>
              {!zona && (
                <p className="text-body-sm text-on-surface-variant">
                  Toca una zona para ver qué falta.
                </p>
              )}
            </div>
          )}
          {seleccionado && (
            <Elegido acopio={seleccionado} enlace={`/acopios/${seleccionado.id}${sufijo}`} />
          )}
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
        <ul className="flex flex-col gap-space-sm">
          {visibles.map((a) => (
            <li key={a.id}>
              <TarjetaAcopio acopio={a} enlace={`/acopios/${a.id}${sufijo}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tarjeta del acopio tocado en el mapa, con lo que no reciben y el paso a la ficha. */
function Elegido({ acopio, enlace }: { acopio: AcopioPublico; enlace: string }) {
  const { data: marcas } = useNoRecibir(acopio.id);
  const ref = useLlevarALaVista<HTMLElement>(acopio.id);
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={`Acopio elegido: ${acopio.nombre}`}
      className="flex scroll-mt-24 flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-md outline-none"
    >
      <div className="flex items-start justify-between gap-space-sm">
        <p className="text-body-sm text-on-surface">{aperturaPublica(acopio)}</p>
        {acopio.distanciaKm !== undefined && (
          <span className="text-label-md text-primary-container tabular-nums">
            {km(acopio.distanciaKm)}
          </span>
        )}
      </div>
      <div>
        <p className="text-body-lg font-semibold text-on-surface">{acopio.nombre}</p>
        <p className="text-body-md text-on-surface-variant">{acopio.entidad.nombre}</p>
      </div>
      <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
        <Icono nombre="location_on" className="text-[18px]" />
        {acopio.direccion} · {acopio.municipio}
      </p>
      {marcas && marcas.length > 0 && (
        <p className="flex items-start gap-space-xs rounded-lg border-l-4 border-secondary-container bg-error-container/40 p-space-sm text-body-sm text-on-surface">
          <Icono nombre="block" className="text-[18px] text-on-error-container" />
          No traigan: {marcas.map((m) => m.categoria.toLocaleLowerCase('es-CO')).join(', ')}
        </p>
      )}
      <EnlaceBoton a={enlace} className="w-full">
        Ver ficha
      </EnlaceBoton>
      <EnlaceBoton
        a={`/voluntariado?acopio=${encodeURIComponent(acopio.id)}`}
        variante="secundario"
        className="w-full"
      >
        Ver jornadas
      </EnlaceBoton>
    </section>
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
