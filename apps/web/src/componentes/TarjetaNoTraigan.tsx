import { diaLargo } from '../formato';
import { Icono } from './Icono';

export interface ItemNoTraigan {
  categoria: string;
  /** Fecha de reapertura (`2026-10-15`); sin ella, hasta que se desmarque. */
  hasta: string | null;
}

interface Props {
  items: ItemNoTraigan[];
  /** «hace 2 h»: antigüedad del dato (RNF-04). */
  actualizado?: string;
}

/** «No traigan» del sistema de diseño (C7, P5 y P6). Sin categorías no se muestra. */
export function TarjetaNoTraigan({ items, actualizado }: Props) {
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="no-traigan"
      className="flex flex-col gap-space-sm rounded-xl border border-error-container border-l-4 border-l-secondary-container bg-error-container/40 p-space-md"
    >
      <h2
        id="no-traigan"
        className="flex items-center gap-space-xs text-label-md text-on-error-container"
      >
        <Icono nombre="block" className="text-[20px]" />
        No traigan
      </h2>
      <ul className="flex flex-col gap-space-xs">
        {items.map((i) => (
          <li key={i.categoria} className="text-body-md text-on-surface">
            <span className="font-semibold">{i.categoria}</span>
            <span className="text-on-surface-variant">
              {' · '}
              {i.hasta ? `hasta el ${diaLargo(i.hasta)}` : 'hasta nuevo aviso'}
            </span>
          </li>
        ))}
      </ul>
      {actualizado && (
        <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <Icono nombre="history" className="text-[16px]" />
          Actualizado {actualizado}
        </p>
      )}
    </section>
  );
}
