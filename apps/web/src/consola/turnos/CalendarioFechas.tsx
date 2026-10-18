import { LIMITES_TURNOS } from '@acopio/shared';
import { useState } from 'react';
import { Icono } from '../../componentes/Icono';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MS_DIA = 86_400_000;

const fecha = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
const sumarDias = (f: string, n: number) =>
  new Date(Date.parse(`${f}T00:00:00Z`) + n * MS_DIA).toISOString().slice(0, 10);

interface Props {
  /** Hoy en Bogotá, `AAAA-MM-DD`. */
  hoy: string;
  fechas: string[];
  alCambiar: (fechas: string[]) => void;
}

/** Calendario de un mes para marcar una o varias fechas (T-12): desde hoy hasta 90 días
 *  después y hasta 14 a la vez. Entrega las fechas ordenadas. */
export function CalendarioFechas({ hoy, fechas, alCambiar }: Props) {
  const [anioHoy, mesHoy] = hoy.split('-').map(Number) as [number, number];
  const tope = sumarDias(hoy, LIMITES_TURNOS.diasHorizonte);
  const [vista, fijarVista] = useState({ anio: anioHoy, mes: mesHoy - 1 });
  const lleno = fechas.length >= LIMITES_TURNOS.fechasPorSerie;

  const primero = new Date(Date.UTC(vista.anio, vista.mes, 1));
  const diasMes = new Date(Date.UTC(vista.anio, vista.mes + 1, 0)).getUTCDate();
  const hueco = (primero.getUTCDay() + 6) % 7; // la semana empieza el lunes
  const anterior = vista.anio * 12 + vista.mes > anioHoy * 12 + mesHoy - 1;
  const siguiente = fecha(vista.anio, vista.mes + 1, 1) <= tope;

  function mover(n: number) {
    const m = vista.mes + n;
    fijarVista({ anio: vista.anio + Math.floor(m / 12), mes: ((m % 12) + 12) % 12 });
  }

  function tocar(f: string) {
    alCambiar(fechas.includes(f) ? fechas.filter((x) => x !== f) : [...fechas, f].sort());
  }

  const titulo = `${MESES[vista.mes]!.charAt(0).toUpperCase()}${MESES[vista.mes]!.slice(1)} de ${vista.anio}`;

  return (
    <div className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          disabled={!anterior}
          onClick={() => mover(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant disabled:opacity-30"
        >
          <Icono nombre="chevron_left" className="text-[24px]" />
        </button>
        <span className="text-label-md text-on-surface">{titulo}</span>
        <button
          type="button"
          aria-label="Mes siguiente"
          disabled={!siguiente}
          onClick={() => mover(1)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant disabled:opacity-30"
        >
          <Icono nombre="chevron_right" className="text-[24px]" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center tabular-nums">
        {SEMANA.map((d, i) => (
          <span key={i} aria-hidden="true" className="text-label-md text-on-surface-variant">
            {d}
          </span>
        ))}
        {Array.from({ length: hueco }, (_, i) => (
          <span key={`h${i}`} />
        ))}
        {Array.from({ length: diasMes }, (_, i) => {
          const f = fecha(vista.anio, vista.mes, i + 1);
          const marcada = fechas.includes(f);
          const fuera = f < hoy || f > tope;
          return (
            <button
              key={f}
              type="button"
              aria-label={`${i + 1} de ${MESES[vista.mes]}`}
              aria-pressed={marcada}
              disabled={fuera || (lleno && !marcada)}
              onClick={() => tocar(f)}
              className={`flex h-10 items-center justify-center rounded-full text-body-md disabled:text-outline-variant ${
                marcada
                  ? 'bg-primary-container font-bold text-on-primary'
                  : f === hoy
                    ? 'border border-primary-container text-on-surface'
                    : 'text-on-surface'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      {lleno && (
        <p className="text-body-sm text-on-surface-variant">
          Ya marcaste {LIMITES_TURNOS.fechasPorSerie} fechas, el máximo de una vez.
        </p>
      )}
    </div>
  );
}
