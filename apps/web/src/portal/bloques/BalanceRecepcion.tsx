import { useState } from 'react';
import { Link } from 'react-router';
import { useBalance, type Balance } from '../../api/inventario';
import { Barra } from '../../componentes/Barra';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Icono } from '../../componentes/Icono';
import { retrasoEntrada } from '../../componentes/movimiento';

type Pestana = 'falta' | 'sobra';

const VACIO: Record<Pestana, string> = {
  falta:
    'Ningún acopio está por debajo de lo mínimo por ahora. Igual revisa el mapa antes de salir.',
  sobra: 'Ningún acopio pide que no le lleven nada por ahora.',
};

const acopios = (n: number) => `${n} ${n === 1 ? 'acopio' : 'acopios'}`;

/** «Qué hace falta» y «No traigan», en pestañas como en Stitch (P-073). Cuenta acopios: no
 *  dice cuáles ni cuánto tiene cada uno. */
export function BalanceRecepcion() {
  const [pestana, fijarPestana] = useState<Pestana>('falta');
  const { data, isPending, error, refetch } = useBalance();
  const clasePestana = (activa: boolean) =>
    `toque relative flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg px-space-sm text-label-md transition-colors duration-200 ${
      activa ? 'text-on-primary' : 'text-on-surface-variant'
    }`;

  return (
    <section
      aria-labelledby="balance-titulo"
      className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-md"
    >
      <div className="flex items-center gap-space-xs">
        <Icono nombre="swap_vert" className="text-[22px] text-primary" />
        <h2 id="balance-titulo" className="text-label-md font-bold text-on-surface">
          Balance de recepción
        </h2>
      </div>
      <div role="tablist" className="relative grid grid-cols-2 rounded-xl bg-surface-container p-1">
        {/* La píldora del elegido se desliza de una pestaña a la otra (ADR-0022) */}
        <span
          aria-hidden="true"
          data-pildora
          className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg shadow-sm transition-[transform,background-color] duration-300 ease-[var(--curva)] ${
            pestana === 'falta' ? 'bg-primary-container' : 'translate-x-full bg-secondary-container'
          }`}
        />
        <button
          type="button"
          role="tab"
          id="pestana-falta"
          aria-selected={pestana === 'falta'}
          aria-controls="panel-balance"
          onClick={() => fijarPestana('falta')}
          className={clasePestana(pestana === 'falta')}
        >
          <Icono nombre="warning" className="text-[18px]" />
          Qué hace falta
        </button>
        <button
          type="button"
          role="tab"
          id="pestana-sobra"
          aria-selected={pestana === 'sobra'}
          aria-controls="panel-balance"
          onClick={() => fijarPestana('sobra')}
          className={clasePestana(pestana === 'sobra')}
        >
          <Icono nombre="block" className="text-[18px]" />
          No traigan
        </button>
      </div>
      <div
        role="tabpanel"
        id="panel-balance"
        aria-labelledby={pestana === 'falta' ? 'pestana-falta' : 'pestana-sobra'}
        className="flex flex-col gap-space-sm"
      >
        {isPending ? (
          <Esqueleto etiqueta="Cargando el balance" className="h-32" />
        ) : error ? (
          <EstadoError
            mensaje="No se pudo cargar el balance."
            alReintentar={() => void refetch()}
          />
        ) : pestana === 'falta' ? (
          <Faltan filas={data.faltan} />
        ) : (
          <NoTraigan filas={data.noTraigan} />
        )}
      </div>
    </section>
  );
}

type Filas = Balance['faltan'];

function Vacio({ texto }: { texto: string }) {
  return (
    <p className="rounded-xl bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">
      {texto}
    </p>
  );
}

function Faltan({ filas }: { filas: Filas }) {
  // /api/publico/necesidades no lista todos los acopios abiertos, así que la barra se mide
  // contra la fila que falta en más acopios («Cambios al construir» de la línea visual)
  const mayor = Math.max(0, ...filas.map((f) => f.acopios));
  return (
    <>
      {filas.length === 0 ? (
        <Vacio texto={VACIO.falta} />
      ) : (
        <ul className="flex flex-col gap-space-xs">
          {filas.map((f, i) => (
            <li
              key={f.categoriaId}
              style={retrasoEntrada(i)}
              className="entra-lista flex flex-col gap-space-xs rounded-xl bg-surface-container-low p-space-sm"
            >
              <span className="flex items-baseline justify-between gap-space-sm">
                <span className="text-label-md font-bold text-on-surface">{f.categoria}</span>
                <span className="shrink-0 text-[13px] font-semibold text-primary-container">
                  Falta en {acopios(f.acopios)}
                </span>
              </span>
              <Barra
                valor={f.acopios}
                total={mayor}
                etiqueta={`${f.categoria}: falta en ${acopios(f.acopios)}`}
              />
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/mapa"
        className="toque mt-space-xs flex min-h-[48px] items-center justify-center gap-space-xs rounded-xl bg-primary-fixed text-label-md text-on-primary-fixed"
      >
        Ver mapa de acopios
        <Icono nombre="chevron_right" className="avanza text-[18px]" />
      </Link>
    </>
  );
}

function NoTraigan({ filas }: { filas: Filas }) {
  if (filas.length === 0) return <Vacio texto={VACIO.sobra} />;
  return (
    <>
      <div className="flex flex-col gap-space-xs rounded-xl bg-error-container/40 p-space-md">
        <div className="flex items-center gap-space-xs text-headline-sm font-bold text-error">
          <Icono nombre="do_not_disturb_on" className="text-[22px]" />
          No los envíes
        </div>
        <p className="text-body-sm text-on-surface">
          Estos acopios marcaron que no reciben estas categorías por ahora.
        </p>
      </div>
      <ul className="flex flex-col gap-space-sm">
        {filas.map((f) => (
          <li
            key={f.categoriaId}
            className="flex min-h-[56px] flex-col justify-center rounded-xl bg-surface-container-low p-space-sm"
          >
            <span className="text-label-md font-bold text-secondary line-through">
              {f.categoria}
            </span>
            <span className="text-body-sm text-on-surface-variant">
              {f.acopios === 1 ? '1 acopio no lo recibe' : `${f.acopios} acopios no lo reciben`}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
