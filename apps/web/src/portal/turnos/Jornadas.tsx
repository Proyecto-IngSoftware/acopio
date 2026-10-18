import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAcopio } from '../../api/red';
import {
  useJornadas,
  type FiltroJornadas,
  type JornadaPublica,
  type Perfil,
} from '../../api/turnos';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { diaBogota, diaSemana } from '../../formato';
import { NOMBRE_PERFIL } from './piezas';
import { TarjetaJornada } from './TarjetaJornada';

type Clave = 'lugar' | 'dia' | 'perfil';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIA = /^\d{4}-\d{2}-\d{2}$/;
interface Opcion {
  valor: string;
  texto: string;
}

/** El lugar va en la URL como `acopio=<id>` o `entidad=<id>`; el día, como `dia=AAAA-MM-DD`. */
function filtroDe(p: URLSearchParams): FiltroJornadas {
  const f: FiltroJornadas = {};
  const acopio = p.get('acopio');
  const entidad = p.get('entidad');
  const dia = p.get('dia');
  const perfil = p.get('perfil');
  // Como en la API: lo mal escrito se ignora en vez de dejar la pantalla en un error
  if (acopio && UUID.test(acopio)) f.acopio = acopio;
  else if (entidad && UUID.test(entidad)) f.entidad = entidad;
  if (dia && DIA.test(dia)) {
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

  function elegir(clave: Clave, valor: string | null) {
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

  const hayFiltro = Object.values(actual).some(Boolean);

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

      <Lista filtro={filtro} hayFiltro={hayFiltro} alLimpiar={() => fijarParametros({})} />

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
                    onClick={() => elegir(abierta, o.valor || null)}
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

function Lista({
  filtro,
  hayFiltro,
  alLimpiar,
}: {
  filtro: FiltroJornadas;
  hayFiltro: boolean;
  alLimpiar: () => void;
}) {
  const { data, isPending, error, refetch } = useJornadas(filtro);
  if (isPending) return <Esqueleto etiqueta="Cargando las jornadas" className="h-64" />;
  if (error)
    return (
      <EstadoError
        mensaje="No se pudieron cargar las jornadas."
        alReintentar={() => void refetch()}
      />
    );
  if (data.length === 0)
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

  const hoy = diaBogota(new Date());
  return (
    <>
      {porDia(data).map(([dia, jornadas]) => {
        const nombre = diaSemana(jornadas[0]!.inicio);
        const titulo =
          dia === hoy ? `Hoy, ${nombre.charAt(0).toLowerCase()}${nombre.slice(1)}` : nombre;
        return (
          <section key={dia} aria-label={titulo} className="flex flex-col gap-space-sm">
            <h2 className="text-label-md text-on-surface">{titulo}</h2>
            {jornadas.map((j) => (
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
