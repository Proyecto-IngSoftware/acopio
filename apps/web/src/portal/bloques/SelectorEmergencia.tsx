import { useState } from 'react';
import type { Emergencia } from '../../api/emergencias';
import { Icono } from '../../componentes/Icono';

interface Props {
  emergencias: Emergencia[];
  elegida: Emergencia;
  alElegir: (id: string) => void;
}

/** Botón desplegable de la franja, como en Stitch. Con una sola emergencia no despliega. */
export function SelectorEmergencia({ emergencias, elegida, alElegir }: Props) {
  const [abierto, fijarAbierto] = useState(false);
  const varias = emergencias.length > 1;
  const posicion = emergencias.indexOf(elegida) + 1;
  const rotulo =
    elegida.estado === 'EN_SEGUIMIENTO'
      ? `En seguimiento (${posicion} de ${emergencias.length})`
      : `Emergencia activa (${posicion} de ${emergencias.length})`;

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup={varias ? 'menu' : undefined}
        aria-expanded={varias ? abierto : undefined}
        onClick={() => varias && fijarAbierto(!abierto)}
        onKeyDown={(e) => e.key === 'Escape' && fijarAbierto(false)}
        className="flex min-h-[48px] w-full items-center justify-between rounded-xl bg-primary-container px-space-md py-space-xs text-left text-on-primary shadow-sm"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-label-caps tracking-wider text-primary-fixed uppercase">
            {rotulo}
          </span>
          <span className="text-headline-sm font-bold break-words">{elegida.nombre}</span>
        </span>
        {varias && <Icono nombre="expand_more" className="text-[24px] text-primary-fixed-dim" />}
      </button>
      {varias && abierto && (
        <div
          role="menu"
          aria-label="Emergencias"
          className="mt-space-xs flex flex-col gap-space-xs rounded-xl bg-surface-container-lowest p-space-sm text-on-surface shadow-lg"
        >
          <p className="p-space-xs text-label-caps text-on-surface-variant uppercase">
            Seleccionar otra emergencia
          </p>
          {emergencias.map((e) => {
            const actual = e.id === elegida.id;
            return (
              <button
                key={e.id}
                type="button"
                role="menuitemradio"
                aria-checked={actual}
                onClick={() => {
                  alElegir(e.id);
                  fijarAbierto(false);
                }}
                className={`flex min-h-[48px] items-center justify-between rounded-lg p-space-sm text-left ${
                  actual ? 'bg-surface-container-high' : 'hover:bg-surface-container'
                }`}
              >
                <span className="flex flex-col">
                  <span
                    className={`text-label-md font-bold ${actual ? 'text-primary' : 'text-on-surface'}`}
                  >
                    {e.nombre}
                  </span>
                  {e.estado === 'EN_SEGUIMIENTO' && (
                    <span className="text-body-sm text-on-surface-variant">En seguimiento</span>
                  )}
                </span>
                <Icono
                  nombre={actual ? 'check_circle' : 'chevron_right'}
                  relleno={actual}
                  className={`text-[20px] ${actual ? 'text-primary' : 'text-outline'}`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
