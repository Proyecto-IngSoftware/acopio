import { Icono } from '../../componentes/Icono';

interface Props {
  etiqueta: string;
  valor: string;
  alCambiar: (q: string) => void;
}

/** Campo de búsqueda de las listas de la consola, con la lupa a la izquierda. */
export function Buscador({ etiqueta, valor, alCambiar }: Props) {
  return (
    <div className="relative">
      <Icono
        nombre="search"
        className="pointer-events-none absolute top-1/2 left-space-md -translate-y-1/2 text-[20px] text-on-surface-variant"
      />
      <input
        type="search"
        aria-label={etiqueta}
        placeholder={etiqueta}
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        className="min-h-[48px] w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest pr-space-md pl-12 text-body-md text-on-surface"
      />
    </div>
  );
}
