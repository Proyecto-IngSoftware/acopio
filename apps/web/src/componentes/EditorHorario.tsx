import { DIAS, erroresHorario, type Dia, type Horario } from '@acopio/shared';
import { useState } from 'react';
import { Boton } from './Boton';
import { Campo } from './Campo';
import { Icono } from './Icono';

export const NOMBRE_DIA: Record<Dia, string> = {
  lun: 'Lunes',
  mar: 'Martes',
  mie: 'Miércoles',
  jue: 'Jueves',
  vie: 'Viernes',
  sab: 'Sábado',
  dom: 'Domingo',
};
/** De lunes a domingo, como se lee un horario en Colombia. */
export const DIAS_SEMANA: Dia[] = [...DIAS.slice(1), 'dom'];

interface Props {
  valor: Horario;
  alCambiar: (h: Horario) => void;
}

/** Horario semanal por tramos (C21 y Mi acopio). Valida con las mismas reglas de la API. */
export function EditorHorario({ valor, alCambiar }: Props) {
  return (
    <div className="flex flex-col divide-y divide-outline-variant">
      {DIAS_SEMANA.map((dia) => (
        <Dia key={dia} dia={dia} valor={valor} alCambiar={alCambiar} />
      ))}
    </div>
  );
}

function Dia({ dia, valor, alCambiar }: Props & { dia: Dia }) {
  const [agregando, fijarAgregando] = useState(false);
  const [abre, fijarAbre] = useState('');
  const [cierra, fijarCierra] = useState('');
  const [error, fijarError] = useState<string | null>(null);
  const tramos = valor[dia];
  const nombre = NOMBRE_DIA[dia];

  function agregar() {
    const nuevo = { ...valor, [dia]: [...tramos, { abre, cierra }] };
    const errores = erroresHorario(nuevo).filter((e) => e.startsWith(`${dia}:`));
    if (errores.length) {
      fijarError(errores[0]!.slice(dia.length + 2));
      return;
    }
    alCambiar({ ...nuevo, [dia]: [...nuevo[dia]].sort((a, b) => a.abre.localeCompare(b.abre)) });
    fijarAgregando(false);
    fijarAbre('');
    fijarCierra('');
    fijarError(null);
  }

  return (
    <fieldset aria-label={nombre} className="flex min-w-0 flex-col gap-space-sm py-space-sm">
      <div className="flex items-center justify-between gap-space-sm">
        <span className="text-label-md text-on-surface">{nombre}</span>
        {!agregando && (
          <button
            type="button"
            aria-label={`Agregar tramo el ${nombre.toLocaleLowerCase('es-CO')}`}
            onClick={() => fijarAgregando(true)}
            className="flex min-h-[44px] items-center gap-1 px-space-xs text-label-md text-primary-container"
          >
            <Icono nombre="add" className="text-[18px]" />
            Agregar tramo
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-space-xs">
        {tramos.length === 0 && (
          <span className="rounded-md bg-surface-container px-2 py-1 text-body-sm text-on-surface-variant">
            Cerrado
          </span>
        )}
        {tramos.map((t) => {
          const texto = `${t.abre} a ${t.cierra}`;
          return (
            <span
              key={texto}
              className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container-low py-1 pr-1 pl-2 text-body-sm text-on-surface tabular-nums"
            >
              {texto}
              <button
                type="button"
                aria-label={`Quitar el tramo de ${texto}`}
                onClick={() => alCambiar({ ...valor, [dia]: tramos.filter((x) => x !== t) })}
                className="flex size-8 items-center justify-center rounded text-on-surface-variant"
              >
                <Icono nombre="close" className="text-[16px]" />
              </button>
            </span>
          );
        })}
      </div>
      {agregando && (
        <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-sm">
          <div className="grid grid-cols-2 gap-space-sm">
            <Campo
              id={`${dia}-abre`}
              etiqueta="Abre"
              placeholder="08:00"
              inputMode="numeric"
              value={abre}
              onChange={(e) => fijarAbre(e.target.value)}
            />
            <Campo
              id={`${dia}-cierra`}
              etiqueta="Cierra"
              placeholder="12:00"
              inputMode="numeric"
              value={cierra}
              onChange={(e) => fijarCierra(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-body-sm text-error">
              {error}
            </p>
          )}
          <div className="flex gap-space-sm">
            <Boton variante="secundario" className="flex-1" onClick={agregar}>
              Agregar
            </Boton>
            <Boton
              variante="terciario"
              className="flex-1"
              onClick={() => {
                fijarAgregando(false);
                fijarError(null);
              }}
            >
              Cancelar
            </Boton>
          </div>
        </div>
      )}
    </fieldset>
  );
}
