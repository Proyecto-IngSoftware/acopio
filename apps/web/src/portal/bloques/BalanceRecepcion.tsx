import { useState } from 'react';
import { Icono } from '../../componentes/Icono';

type Pestana = 'falta' | 'sobra';

const VACIO: Record<Pestana, string> = {
  falta: 'Todavía no hay acopios registrados. Aquí verás qué insumos escasean en cada uno.',
  sobra: 'Todavía no hay acopios registrados. Aquí verás qué ya sobra, para que no lo lleves.',
};

/** «Qué hace falta» y «No traigan», en pestañas como en Stitch. Vacío hasta que exista
 *  el módulo de inventario. */
export function BalanceRecepcion() {
  const [pestana, fijarPestana] = useState<Pestana>('falta');
  const clasePestana = (activa: boolean, color: string) =>
    `flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg px-space-sm text-label-md transition-colors ${
      activa ? `${color} text-on-primary shadow-sm` : 'bg-transparent text-on-surface-variant'
    }`;

  return (
    <section
      aria-labelledby="balance-titulo"
      className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-md"
    >
      <div className="flex items-center gap-space-xs">
        <Icono nombre="swap_vert" className="text-[22px] text-primary" />
        <h2 id="balance-titulo" className="text-label-md font-bold text-on-surface">
          Balance de Recepción
        </h2>
      </div>
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-container p-1">
        <button
          type="button"
          role="tab"
          id="pestana-falta"
          aria-selected={pestana === 'falta'}
          aria-controls="panel-balance"
          onClick={() => fijarPestana('falta')}
          className={clasePestana(pestana === 'falta', 'bg-primary-container')}
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
          className={clasePestana(pestana === 'sobra', 'bg-secondary-container')}
        >
          <Icono nombre="block" className="text-[18px]" />
          No traigan
        </button>
      </div>
      <div
        role="tabpanel"
        id="panel-balance"
        aria-labelledby={pestana === 'falta' ? 'pestana-falta' : 'pestana-sobra'}
        className="rounded-xl bg-surface-container-low p-space-md text-body-sm text-on-surface-variant"
      >
        {VACIO[pestana]}
      </div>
    </section>
  );
}
