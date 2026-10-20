import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAcopio } from '../../api/red';
import {
  useJornadas,
  type FiltroJornadas,
  type JornadaPublica,
  type Perfil,
} from '../../api/turnos';
import { ChipsEstado } from '../../componentes/ChipsEstado';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { diaBogota, diaSemana } from '../../formato';
import { estadoCupos, porLugar, type EstadoCupos } from './cupos';
import { NOMBRE_PERFIL } from './piezas';
import { TarjetaJornada } from './TarjetaJornada';

// Leaflet solo se descarga si alguien abre la vista de mapa
const MapaJornadas = lazy(() => import('./MapaJornadas'));

type Clave = 'lugar' | 'dia' | 'perfil';
type Chip = 'todas' | Exclude<EstadoCupos, 'llena'>;
const leerChip = (v: string | null): Chip => (v === 'faltan' || v === 'cupos' ? v : 'todas');
// El mismo patrón que `z.uuid()` de la API: con el dígito de versión y la variante
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;
/** `2026-02-30` tiene la forma, pero no existe: el Date lo corre al 2 de marzo. */
const diaExiste = (dia: string) =>
  DIA.test(dia) && new Date(`${dia}T00:00:00Z`).toISOString().startsWith(dia);
interface Opcion {
  valor: string;
  texto: string;
}

/** El lugar va en la URL como `acopio=<id>` o `entidad=<id>`; el día, como `dia=AAAA-MM-DD`. */
function filtroDe(p: URLSearchParams): FiltroJornadas {
  const f: FiltroJornadas = {};
  // Las opciones llegan en minúsculas; un enlace en mayúsculas debe coincidir con ellas
  const acopio = p.get('acopio')?.toLowerCase();
  const entidad = p.get('entidad')?.toLowerCase();
  const dia = p.get('dia');
  const perfil = p.get('perfil');
  // Como en la API: lo mal escrito se ignora en vez de dejar la pantalla en un error
  if (acopio && UUID.test(acopio)) f.acopio = acopio;
  else if (entidad && UUID.test(entidad)) f.entidad = entidad;
  if (dia && diaExiste(dia)) {
    f.desde = dia;
    f.hasta = dia;
  }
  if (perfil && perfil in NOMBRE_PERFIL) f.perfil = perfil as Perfil;
  return f;
}

/** P7 Voluntariado (RF-TUR-002, HU-03): las jornadas por día, con sus cupos reservados. */
export function Jornadas() {
  const [parametros, fijarParametros] = useSearchParams();
  const filtro = filtroDe(parametros);
  // Las opciones de lugar y día salen de todas las jornadas, sin filtrar
  const todas = useJornadas();
  const [abierta, abrir] = useState<Clave | null>(null);
  // Abre en el mapa, como P5; la lista va en `vista=lista`
  const vista = parametros.get('vista') === 'lista' ? 'lista' : 'mapa';
  const chip = leerChip(parametros.get('estado'));
  const [elegido, fijarElegido] = useState<string | null>(null);
  const elegir = useCallback((id: string) => fijarElegido(id), []);
  const jornadas = useJornadas(filtro);

  const lugares = unicos(
    (todas.data ?? []).map((j) => ({
      valor: `${j.lugar.tipo === 'ACOPIO' ? 'acopio' : 'entidad'}:${j.lugar.id}`,
      texto: j.lugar.nombre,
    })),
  );
  // Un acopio sin jornadas no sale en las opciones: su nombre se pide aparte
  const sinOpcion =
    Boolean(filtro.acopio) && !lugares.some((o) => o.valor === `acopio:${filtro.acopio}`);
  const acopio = useAcopio(filtro.acopio ?? '', sinOpcion && todas.isSuccess);
  if (sinOpcion && acopio.data)
    lugares.push({ valor: `acopio:${acopio.data.id}`, texto: acopio.data.nombre });
  const dias = unicos(
    (todas.data ?? []).map((j) => ({ valor: diaBogota(j.inicio), texto: diaSemana(j.inicio) })),
  );
  const perfiles = Object.entries(NOMBRE_PERFIL).map(([valor, texto]) => ({ valor, texto }));

  const lugarActual = filtro.acopio
    ? `acopio:${filtro.acopio}`
    : filtro.entidad
      ? `entidad:${filtro.entidad}`
      : null;
  const actual: Record<Clave, string | null> = {
    lugar: lugarActual,
    dia: filtro.desde ?? null,
    perfil: filtro.perfil ?? null,
  };
  const opciones: Record<Clave, Opcion[]> = { lugar: lugares, dia: dias, perfil: perfiles };
  const nombres: Record<Clave, string> = { lugar: 'Lugar', dia: 'Día', perfil: 'Perfil' };
  const titulos: Record<Clave, string> = {
    lugar: 'Dónde',
    dia: 'Qué día',
    perfil: 'Perfil que pide la jornada',
  };

  function cambiar(clave: string, valor: string | null) {
    const p = new URLSearchParams(parametros);
    if (valor === null) p.delete(clave);
    else p.set(clave, valor);
    fijarParametros(p, { replace: true });
  }

  function elegirFiltro(clave: Clave, valor: string | null) {
    const p = new URLSearchParams(parametros);
    if (clave === 'lugar') {
      p.delete('acopio');
      p.delete('entidad');
      if (valor) {
        const [tipo, id] = valor.split(':');
        p.set(tipo!, id!);
      }
    } else if (valor) p.set(clave, valor);
    else p.delete(clave);
    fijarParametros(p, { replace: true });
    abrir(null);
  }

  const hayFiltro = Object.values(actual).some(Boolean) || chip !== 'todas';

  // Los chips cuentan jornadas, no lugares, y son excluyentes según la etiqueta
  const datos = jornadas.data;
  const cuentas = useMemo(() => {
    const c = { todas: datos?.length ?? 0, faltan: 0, cupos: 0 };
    for (const j of datos ?? []) {
      const e = estadoCupos(j)?.estado;
      if (e === 'faltan' || e === 'cupos') c[e]++;
    }
    return c;
  }, [datos]);
  const filtradas = useMemo(
    () =>
      chip === 'todas'
        ? (datos ?? [])
        : (datos ?? []).filter((j) => estadoCupos(j)?.estado === chip),
    [datos, chip],
  );
  // En el mapa solo entran las que aceptan reservas o están llenas
  const enMapa = useMemo(() => filtradas.filter((j) => estadoCupos(j)), [filtradas]);
  const grupos = useMemo(() => porLugar(enMapa), [enMapa]);
  const sinUbicacion = enMapa.filter((j) => j.lugar.lat === null || j.lugar.lng === null).length;
  const seleccionado = grupos.find((g) => g.lugar.id === elegido);

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-lg">
      <header className="flex flex-col gap-space-xs">
        <h1 className="text-headline-lg-mobile text-on-surface">Voluntariado</h1>
        <p className="text-body-md text-on-surface-variant">
          Reserva un cupo antes de salir, así sabes que te esperan y no llegas a un lugar donde ya
          sobra gente.
        </p>
      </header>

      <div className="-mx-margin flex gap-space-xs overflow-x-auto px-margin [scrollbar-width:none]">
        {(['lugar', 'dia', 'perfil'] as const).map((clave) => {
          const valor = actual[clave];
          const texto = valor
            ? (opciones[clave].find((o) => o.valor === valor)?.texto ?? nombres[clave])
            : nombres[clave];
          return (
            <button
              key={clave}
              type="button"
              aria-pressed={Boolean(valor)}
              aria-haspopup="dialog"
              onClick={() => abrir(clave)}
              className={`flex min-h-[40px] shrink-0 items-center gap-1 rounded-full border px-space-md text-label-md ${
                valor
                  ? 'border-primary-container bg-primary-container text-on-primary'
                  : 'border-outline-variant bg-surface-container-lowest text-on-surface'
              }`}
            >
              {texto}
              <Icono nombre="expand_more" className="text-[18px]" />
            </button>
          );
        })}
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

      {cuentas.todas > 0 && (
        <ChipsEstado
          etiqueta="Ver por cupos"
          valor={chip}
          alCambiar={(v) => cambiar('estado', v === 'todas' ? null : v)}
          opciones={[
            { valor: 'todas', texto: 'Todas', cuenta: cuentas.todas },
            {
              valor: 'faltan',
              texto: 'Falta gente',
              cuenta: cuentas.faltan,
              punto: 'bg-secondary-container',
            },
            {
              valor: 'cupos',
              texto: 'Con cupos',
              cuenta: cuentas.cupos,
              punto: 'bg-primary-container',
            },
          ]}
        />
      )}

      {jornadas.isPending ? (
        <Esqueleto etiqueta="Cargando las jornadas" className="h-64" />
      ) : jornadas.error ? (
        <EstadoError
          mensaje="No se pudieron cargar las jornadas."
          alReintentar={() => void jornadas.refetch()}
        />
      ) : filtradas.length === 0 ? (
        <SinJornadas hayFiltro={hayFiltro} alLimpiar={() => fijarParametros({})} />
      ) : vista === 'lista' ? (
        <Lista jornadas={filtradas} />
      ) : (
        <>
          {grupos.length > 0 ? (
            <div className="isolate h-[55vh] min-h-72 overflow-hidden rounded-xl border border-outline-variant">
              <Suspense fallback={<Esqueleto etiqueta="Cargando el mapa" className="size-full" />}>
                <MapaJornadas grupos={grupos} elegido={elegido} alElegir={elegir} />
              </Suspense>
            </div>
          ) : (
            <EstadoVacio titulo="Ninguna jornada en el mapa">
              Las jornadas que se ven aquí no tienen ubicación o ya no reciben reservas. Míralas en
              la lista.
            </EstadoVacio>
          )}
          {sinUbicacion > 0 && (
            <p className="flex items-start gap-space-xs text-body-sm text-on-surface-variant">
              <Icono nombre="location_off" className="text-[18px]" />
              {sinUbicacion === 1
                ? '1 jornada no tiene ubicación en el mapa; está en la lista.'
                : `${sinUbicacion} jornadas no tienen ubicación en el mapa; están en la lista.`}
            </p>
          )}
          {grupos.length > 0 && !seleccionado && (
            <p className="text-body-sm text-on-surface-variant">
              Toca un lugar para ver sus jornadas.
            </p>
          )}
          {seleccionado && (
            <section aria-label={seleccionado.lugar.nombre} className="flex flex-col gap-space-sm">
              <h2 className="text-label-md text-on-surface">{seleccionado.lugar.nombre}</h2>
              {seleccionado.jornadas.map((j) => (
                <TarjetaJornada key={j.id} jornada={j} />
              ))}
            </section>
          )}
        </>
      )}

      {abierta && (
        <Hoja titulo={titulos[abierta]} alCerrar={() => abrir(null)}>
          <div className="flex flex-col gap-space-xs">
            {[{ valor: '', texto: abierta === 'dia' ? 'Cualquier día' : 'Cualquiera' }]
              .concat(opciones[abierta])
              .map((o) => {
                const elegida = (actual[abierta] ?? '') === o.valor;
                return (
                  <button
                    key={o.valor || 'todas'}
                    type="button"
                    aria-pressed={elegida}
                    onClick={() => elegirFiltro(abierta, o.valor || null)}
                    className={`flex min-h-[48px] items-center gap-space-sm rounded-xl border px-space-md text-left text-body-md ${
                      elegida
                        ? 'border-primary-container text-primary-container'
                        : 'border-outline-variant text-on-surface'
                    }`}
                  >
                    {o.texto}
                    {elegida && <Icono nombre="check" className="ml-auto text-[20px]" />}
                  </button>
                );
              })}
          </div>
        </Hoja>
      )}
    </div>
  );
}

function SinJornadas({ hayFiltro, alLimpiar }: { hayFiltro: boolean; alLimpiar: () => void }) {
  return (
    <>
      <EstadoVacio titulo="Por ahora no hay jornadas abiertas">
        {hayFiltro
          ? 'Ninguna jornada coincide con los filtros.'
          : 'Los acopios y las entidades publican aquí sus jornadas cuando necesitan manos.'}
      </EstadoVacio>
      {hayFiltro && (
        <button
          type="button"
          onClick={alLimpiar}
          className="min-h-[48px] self-start rounded-xl border border-outline-variant bg-surface-container-lowest px-space-md text-label-md text-primary"
        >
          Quitar los filtros
        </button>
      )}
    </>
  );
}

function Lista({ jornadas }: { jornadas: JornadaPublica[] }) {
  const hoy = diaBogota(new Date());
  return (
    <>
      {porDia(jornadas).map(([dia, delDia]) => {
        const nombre = diaSemana(delDia[0]!.inicio);
        const titulo =
          dia === hoy ? `Hoy, ${nombre.charAt(0).toLowerCase()}${nombre.slice(1)}` : nombre;
        return (
          <section key={dia} aria-label={titulo} className="flex flex-col gap-space-sm">
            <h2 className="text-label-md text-on-surface">{titulo}</h2>
            {delDia.map((j) => (
              <TarjetaJornada key={j.id} jornada={j} />
            ))}
          </section>
        );
      })}
    </>
  );
}

/** Agrupadas por día de Bogotá, en el orden en que llegan (la API ya las ordena por inicio). */
function porDia(jornadas: JornadaPublica[]): [string, JornadaPublica[]][] {
  const grupos = new Map<string, JornadaPublica[]>();
  for (const j of jornadas) {
    const dia = diaBogota(j.inicio);
    grupos.set(dia, [...(grupos.get(dia) ?? []), j]);
  }
  return [...grupos];
}

const unicos = (opciones: Opcion[]) => [...new Map(opciones.map((o) => [o.valor, o])).values()];
