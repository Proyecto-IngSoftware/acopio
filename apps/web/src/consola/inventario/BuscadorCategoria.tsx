import type { Ref } from 'react';
import { useBuscarCategorias, type ResultadoBusqueda } from '../../api/catalogo';
import { Icono } from '../../componentes/Icono';

/** Búsqueda de categoría de C4, C5 y C6. Consulta mientras se escribe y entrega la elegida. */
export function BuscadorCategoria({
  id,
  q,
  onQ,
  onElegir,
  ref,
}: {
  id: string;
  q: string;
  onQ: (q: string) => void;
  onElegir: (c: ResultadoBusqueda) => void;
  ref?: Ref<HTMLInputElement>;
}) {
  const resultados = useBuscarCategorias(q);
  return (
    <div className="flex flex-col gap-space-xs">
      <label className="relative">
        <span className="sr-only">Categoría</span>
        <Icono
          nombre="search"
          className="pointer-events-none absolute top-1/2 left-space-md -translate-y-1/2 text-[22px] text-on-surface-variant"
        />
        <input
          ref={ref}
          id={id}
          type="search"
          aria-label="Categoría"
          placeholder="Busca: arroz, pañal, agua…"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          className="min-h-[56px] w-full rounded-xl border-[1.5px] border-outline bg-surface-container-lowest pr-space-md pl-12 text-body-lg text-on-surface"
        />
      </label>
      {(resultados.data ?? []).length > 0 && (
        <ul aria-label="Resultados" className="flex flex-col gap-space-xs">
          {resultados.data!.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onElegir(c)}
                className="flex min-h-[48px] w-full items-center justify-between rounded-xl bg-surface-container-lowest px-space-md text-left shadow-sm"
              >
                <span className="font-bold text-on-surface">{c.nombre}</span>
                <Icono nombre="chevron_right" className="text-[20px] text-outline" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
