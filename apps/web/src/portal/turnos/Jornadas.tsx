import { useCallback, useMemo, useState } from 'react';
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
import { Boton } from '../../componentes/Boton';
import { Segmentado } from '../../componentes/Segmentado';
import { TiraDias } from '../../componentes/TiraDias';
import { retrasoEntrada } from '../../componentes/movimiento';
import { diaBogota, diasDeLaTira, type DiaTira } from '../../formato';
import { estadoCupos, porLugar, type EstadoCupos } from './cupos';
// El mapa es la vista por defecto y esta pantalla ya se descarga al abrirla (rutas.tsx): Leaflet
// viaja en su mismo fragmento y así se ahorra una ida y vuelta en 3G, como en P5 (I-02)
import MapaJornadas from './MapaJornadas';
import { NOMBRE_PERFIL } from './piezas';
import { FilaJornada } from './FilaJornada';

type Clave = 'lugar' | 'perfil';
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
  const tira = tiraDe(todas.data ?? []);
  const perfiles = Object.entries(NOMBRE_PERFIL).map(([valor, texto]) => ({ valor, texto }));

  const lugarActual = filtro.acopio
    ? `acopio:${filtro.acopio}`
    : filtro.entidad
      ? `entidad:${filtro.entidad}`
      : null;
  const actual: Record<Clave, string | null> = {
    lugar: lugarActual,
    perfil: filtro.perfil ?? null,
  };
  const opciones: Record<Clave, Opcion[]> = { lugar: lugares, perfil: perfiles };
  const nombres: Record<Clave, string> = { lugar: 'Lugar', perfil: 'Perfil' };
  const titulos: Record<Clave, string> = {
    lugar: 'Dónde',
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

  const hayFiltro =
    Object.values(actual).some(Boolean) || Boolean(filtro.desde) || chip !== 'todas';

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
        {(['lugar', 'perfil'] as const).map((clave) => {
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
              className={`toque flex min-h-[40px] shrink-0 items-center gap-1 rounded-full border px-space-md text-label-md ${
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

      <TiraDias
        etiqueta="Día"
        dias={tira}
        elegido={filtro.desde ?? 'todos'}
        alElegir={(clave) => cambiar('dia', clave === 'todos' ? null : clave)}
      />

      <Segmentado
        etiqueta="Ver como"
        valor={vista}
        alCambiar={(v) => cambiar('vista', v === 'lista' ? 'lista' : null)}
        opciones={[
          { valor: 'mapa', texto: 'Mapa', icono: 'map' },
          { valor: 'lista', texto: 'Lista', icono: 'list' },
        ]}
      />

      {/* Un ?estado= de un enlace compartido deja su chip aunque no haya jornadas, para quitarlo */}
      {(cuentas.todas > 0 || chip !== 'todas') && (
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
        <SinJornadas
          hayFiltro={hayFiltro}
          alLimpiar={() => fijarParametros(vista === 'lista' ? { vista } : {})}
        />
      ) : vista === 'lista' ? (
        <Lista key={`${filtro.desde ?? 'todos'}-${chip}`} jornadas={filtradas} />
      ) : (
        <>
          {grupos.length > 0 ? (
            <div className="isolate h-[55vh] min-h-72 overflow-hidden rounded-xl border border-outline-variant">
              <MapaJornadas grupos={grupos} elegido={elegido} alElegir={elegir} />
            </div>
          ) : (
            <EstadoVacio titulo="Ninguna jornada en el mapa" ilustracion="calendario">
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
                <FilaJornada key={j.id} jornada={j} />
              ))}
            </section>
          )}
        </>
      )}

      {abierta && (
        <Hoja titulo={titulos[abierta]} alCerrar={() => abrir(null)}>
          <div className="flex flex-col gap-space-xs">
            {[{ valor: '', texto: 'Cualquiera' }].concat(opciones[abierta]).map((o) => {
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
      <EstadoVacio titulo="Por ahora no hay jornadas abiertas" ilustracion="calendario">
        {hayFiltro
          ? 'Ninguna jornada coincide con los filtros.'
          : 'Los acopios y las entidades publican aquí sus jornadas cuando necesitan manos.'}
      </EstadoVacio>
      {hayFiltro && (
        <Boton variante="secundario" onClick={alLimpiar} className="self-start">
          Quitar los filtros
        </Boton>
      )}
    </>
  );
}

/** Las jornadas en filas, sin encabezados por día: la fecha va en cada fila. Entran
 *  escalonadas cada vez que cambia el filtro (quien llama cambia la `key`). */
function Lista({ jornadas }: { jornadas: JornadaPublica[] }) {
  return (
    <div className="flex flex-col gap-space-sm">
      {jornadas.map((j, i) => (
        <FilaJornada key={j.id} jornada={j} className="entra-lista" style={retrasoEntrada(i)} />
      ))}
    </div>
  );
}

/** «Todos» y los días desde hoy hasta la última jornada, entre una semana y un mes. */
function tiraDe(jornadas: JornadaPublica[]): DiaTira[] {
  const hoy = new Date();
  const conEventos = new Set(jornadas.map((j) => diaBogota(j.inicio)));
  const ultima = jornadas.reduce((m, j) => (j.inicio > m ? j.inicio : m), '');
  const hasta = ultima ? Math.ceil((Date.parse(ultima) - hoy.getTime()) / 86_400_000) + 1 : 0;
  const todos: DiaTira = {
    clave: 'todos',
    arriba: 'Todos',
    numero: String(jornadas.length),
    nombre: 'Todos los días',
    conEventos: false,
  };
  return [todos, ...diasDeLaTira(hoy, Math.min(30, Math.max(7, hasta)), conEventos)];
}

const unicos = (opciones: Opcion[]) => [...new Map(opciones.map((o) => [o.valor, o])).values()];
