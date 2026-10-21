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

/** Control segmentado: radios con aspecto de botones (Activo / Pausado, Mapa / Lista). La
 *  píldora del elegido se desliza de una opción a otra. */
export function Segmentado<T extends string>({ etiqueta, valor, alCambiar, opciones }: Props<T>) {
  const nombre = useId();
  const n = opciones.length;
  const i = opciones.findIndex((o) => o.valor === valor);
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="relative grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1"
    >
      {i >= 0 && (
        <span
          aria-hidden="true"
          data-pildora
          className="absolute top-1 bottom-1 left-1 rounded-lg bg-primary-container transition-transform duration-300 ease-[var(--curva)]"
          style={{
            width: `calc((100% - 0.5rem - ${n - 1} * 0.25rem) / ${n})`,
            transform: `translateX(calc(${i} * (100% + 0.25rem)))`,
          }}
        />
      )}
      {opciones.map((o) => (
        <label
          key={o.valor}
          className="relative flex min-h-[48px] cursor-pointer items-center justify-center gap-space-xs rounded-lg text-label-md text-on-surface-variant transition-colors has-checked:text-on-primary has-focus-visible:outline-2 has-focus-visible:outline-primary"
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
