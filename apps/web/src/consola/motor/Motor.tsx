import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ultimaRonda,
  useRecalcular,
  useSugerenciasMotor,
  type EstadoSugerencia,
  type FiltroSugerencias,
  type Sugerencia,
} from '../../api/motor';
import { Boton } from '../../componentes/Boton';
import { Selector } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';
import { Pildora } from '../../componentes/Pildora';
import { fechaHora } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';
import { HojaAprobar } from './HojaAprobar';
import { HojaDescartar } from './HojaDescartar';
import { TarjetaSugerencia } from './TarjetaSugerencia';

const ESTADOS: [EstadoSugerencia, string][] = [
  ['PROPUESTA', 'Propuestas'],
  ['APROBADA', 'Aprobadas'],
  ['DESCARTADA', 'Descartadas'],
];

type Opcion = { id: string; nombre: string };
const distintas = (lista: Opcion[]) =>
  [...new Map(lista.map((o) => [o.id, o])).values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'),
  );

/** C11 Motor de sugerencias (RF-MOT-007). Diseño: docs/03-diseno/stitch/C11-motor. */
export function Motor() {
  const enLinea = useEnLinea();
  const [params, fijarParams] = useSearchParams();
  const filtro: FiltroSugerencias = {
    estado: (params.get('estado') as EstadoSugerencia | null) ?? 'PROPUESTA',
    ...(params.get('zona') ? { zona: params.get('zona')! } : {}),
    ...(params.get('acopio') ? { acopio: params.get('acopio')! } : {}),
    ...(params.get('categoria') ? { categoria: params.get('categoria')! } : {}),
  };
  const consulta = useSugerenciasMotor(filtro);
  const recalcular = useRecalcular();
  const [aviso, fijarAviso] = useState<string | null>(null);
  const [aprobando, fijarAprobando] = useState<Sugerencia | null>(null);
  const [descartando, fijarDescartando] = useState<Sugerencia | null>(null);

  const lista = useMemo(
    () => [...(consulta.data ?? [])].sort((a, b) => b.puntaje - a.puntaje),
    [consulta.data],
  );
  const ronda = recalcular.data?.ronda ?? ultimaRonda(lista);

  function yaNoSePuede(codigo: string) {
    fijarAviso(
      codigo === 'SUGERENCIA_NO_ENCONTRADA'
        ? 'Esa sugerencia ya no está: el motor recalculó'
        : 'Otra persona ya decidió esta sugerencia',
    );
    void consulta.refetch();
  }

  // Los nombres vistos, para que un filtro siga visible aunque la lista nueva no lo traiga
  const conocidos = useRef(new Map<string, string>());
  for (const s of consulta.data ?? []) {
    for (const o of [s.zona, s.acopio, s.categoria]) conocidos.current.set(o.id, o.nombre);
  }
  const hayFiltros = Boolean(filtro.zona || filtro.acopio || filtro.categoria);

  function quitarFiltros() {
    const nuevos = new URLSearchParams(params);
    for (const clave of ['zona', 'acopio', 'categoria']) nuevos.delete(clave);
    fijarParams(nuevos, { replace: true });
  }

  function cambiar(clave: keyof FiltroSugerencias, valor: string | undefined) {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    fijarParams(nuevos, { replace: true });
  }

  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Motor de sugerencias" />
        <NecesitaRed titulo="El motor necesita conexión" acopioId="">
          Vuelve a abrirlo cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Motor de sugerencias" />
      <section className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
        <div className="flex flex-wrap items-center gap-space-sm">
          <Boton
            ocupado={recalcular.isPending}
            onClick={() =>
              recalcular.mutate(undefined, {
                onSuccess: (r) =>
                  fijarAviso(
                    `Ronda nueva: ${r.generadas} ${r.generadas === 1 ? 'sugerencia' : 'sugerencias'}`,
                  ),
              })
            }
          >
            <Icono nombre="autorenew" className="text-[20px]" />
            {recalcular.isPending ? 'Recalculando…' : 'Recalcular'}
          </Boton>
          <Link to="/consola/motor/pesos" className="ml-auto text-label-md text-primary-container">
            Pesos
          </Link>
          <Link to="/consola/motor/descartes" className="text-label-md text-primary-container">
            Descartes
          </Link>
        </div>
        <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Icono nombre="schedule" className="text-[18px]" />
          {ronda
            ? `Última ronda: ${fechaHora(ronda)} · ${lista.length} ${lista.length === 1 ? 'sugerencia' : 'sugerencias'}`
            : 'Sin rondas todavía'}
        </p>
        {recalcular.error && (
          <p role="alert" className="text-body-sm text-error">
            {recalcular.error.message}
          </p>
        )}
      </section>

      {aviso && (
        <p
          role="status"
          className="rounded-xl bg-surface-container-low p-space-sm text-body-md text-on-surface"
        >
          {aviso}
        </p>
      )}

      <div className="flex gap-space-xs overflow-x-auto" role="group" aria-label="Estado">
        {ESTADOS.map(([estado, texto]) => (
          <Pildora
            key={estado}
            activa={filtro.estado === estado}
            texto={filtro.estado === estado && consulta.data ? `${texto} ${lista.length}` : texto}
            alTocar={() => cambiar('estado', estado)}
          />
        ))}
      </div>
      <Filtros
        lista={consulta.data ?? []}
        filtro={filtro}
        conocidos={conocidos.current}
        alCambiar={cambiar}
      />
      {hayFiltros && (
        <Boton variante="terciario" className="w-fit" onClick={quitarFiltros}>
          Quitar filtros
        </Boton>
      )}

      {consulta.isPending && <Esqueleto etiqueta="Cargando sugerencias" />}
      {consulta.error && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {consulta.data && lista.length === 0 && (
        <EstadoVacio titulo="El motor no encontró traslados que hacer">
          Recalcula cuando cambie el inventario o la necesidad de una zona.
        </EstadoVacio>
      )}
      <div className="flex flex-col gap-space-sm">
        {lista.map((s) => (
          <TarjetaSugerencia
            key={s.id}
            sugerencia={s}
            alAprobar={() => fijarAprobando(s)}
            alDescartar={() => fijarDescartando(s)}
          />
        ))}
      </div>

      {aprobando && (
        <HojaAprobar
          sugerencia={aprobando}
          alCerrar={() => fijarAprobando(null)}
          alAprobar={(r) => {
            fijarAprobando(null);
            fijarAviso(
              r.remision.creada
                ? `Se creó la remisión ${r.remision.codigo}`
                : `Sumado a ${r.remision.codigo}`,
            );
          }}
          alDecidida={(codigo) => {
            fijarAprobando(null);
            yaNoSePuede(codigo);
          }}
        />
      )}
      {descartando && (
        <HojaDescartar
          sugerencia={descartando}
          alCerrar={() => fijarDescartando(null)}
          alDescartar={() => {
            fijarDescartando(null);
            fijarAviso('Sugerencia descartada. Este par no se vuelve a sugerir en 24 horas');
          }}
          alDecidida={(codigo) => {
            fijarDescartando(null);
            yaNoSePuede(codigo);
          }}
        />
      )}
    </div>
  );
}

function Filtros({
  lista,
  filtro,
  conocidos,
  alCambiar,
}: {
  lista: Sugerencia[];
  filtro: FiltroSugerencias;
  conocidos: Map<string, string>;
  alCambiar: (clave: keyof FiltroSugerencias, valor: string | undefined) => void;
}) {
  const grupos = [
    ['zona', 'Zona', distintas(lista.map((s) => s.zona))],
    ['acopio', 'Acopio', distintas(lista.map((s) => s.acopio))],
    ['categoria', 'Categoría', distintas(lista.map((s) => s.categoria))],
  ] as const;
  return (
    <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-3">
      {grupos.map(([clave, etiqueta, deLaLista]) => {
        const elegido = filtro[clave];
        // El elegido sigue como opción aunque la lista filtrada ya no lo traiga
        const opciones =
          elegido && !deLaLista.some((o) => o.id === elegido)
            ? [...deLaLista, { id: elegido, nombre: conocidos.get(elegido) ?? 'Filtro activo' }]
            : deLaLista;
        return (
          <Selector
            key={clave}
            id={`filtro-${clave}`}
            etiqueta={etiqueta}
            value={filtro[clave] ?? ''}
            onChange={(e) => alCambiar(clave, e.target.value || undefined)}
          >
            <option value="">Todas</option>
            {opciones.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </Selector>
        );
      })}
    </div>
  );
}
