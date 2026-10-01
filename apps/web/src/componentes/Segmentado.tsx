import { useId } from 'react';
import { Icono } from './Icono';

interface Opcion<T extends string> {
  valor: T;
  texto: string;
  icono?: string;
}

interface Props<T extends string> {
  etiqueta: string;
  valor: T;
  alCambiar: (v: T) => void;
  opciones: Opcion<T>[];
}

/** Control segmentado: radios con aspecto de botones (Activo / Pausado, Mapa / Lista). */
export function Segmentado<T extends string>({ etiqueta, valor, alCambiar, opciones }: Props<T>) {
  const nombre = useId();
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1"
    >
      {opciones.map((o) => (
        <label
          key={o.valor}
          className="flex min-h-[48px] cursor-pointer items-center justify-center gap-space-xs rounded-lg text-label-md text-on-surface-variant has-checked:bg-primary-container has-checked:text-on-primary has-focus-visible:outline-2 has-focus-visible:outline-primary"
        >
          <input
            type="radio"
            name={nombre}
            value={o.valor}
            checked={valor === o.valor}
            onChange={() => alCambiar(o.valor)}
            className="sr-only"
          />
          {o.icono && <Icono nombre={o.icono} className="text-[20px]" />}
          {o.texto}
        </label>
      ))}
    </div>
  );
}
