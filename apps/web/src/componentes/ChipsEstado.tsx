interface Opcion<T extends string> {
  valor: T;
  texto: string;
  cuenta: number;
  /** Clase del fondo del puntito de color que acompaña al texto. */
  punto?: string;
}

interface Props<T extends string> {
  etiqueta: string;
  valor: T;
  alCambiar: (v: T) => void;
  opciones: Opcion<T>[];
}

/** Fila de chips que filtran por estado, cada uno con cuántos hay («Todos 6», «Falta 2»). Un chip
 *  con 0 no se dibuja, salvo el elegido, para que siempre se vea qué filtro está puesto. */
export function ChipsEstado<T extends string>({ etiqueta, valor, alCambiar, opciones }: Props<T>) {
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-space-xs">
      {opciones
        .filter((o) => o.cuenta > 0 || o.valor === valor)
        .map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={o.valor === valor}
            onClick={() => alCambiar(o.valor)}
            className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-[999px] border border-outline-variant bg-surface-container-lowest px-space-sm text-label-md text-on-surface aria-pressed:border-primary-container aria-pressed:bg-primary-container aria-pressed:text-on-primary"
          >
            {o.punto && <span aria-hidden="true" className={`size-2 rounded-[999px] ${o.punto}`} />}
            {o.texto} <span className="font-bold tabular-nums">{o.cuenta}</span>
          </button>
        ))}
    </div>
  );
}
