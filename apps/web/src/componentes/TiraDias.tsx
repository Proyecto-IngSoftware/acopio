import type { DiaTira } from '../formato';

interface Props {
  etiqueta: string;
  dias: DiaTira[];
  elegido: string;
  alElegir: (clave: string) => void;
}

/** Fila deslizable de días para filtrar una agenda. El punto marca los días con eventos.
 *  La opción «Todos» la arma quien llama, como un día más con clave `todos`. */
export function TiraDias({ etiqueta, dias, elegido, alElegir }: Props) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="-mx-margin flex gap-space-xs overflow-x-auto px-margin pb-1 [scrollbar-width:none]"
    >
      {dias.map((d) => {
        const activo = d.clave === elegido;
        const color = activo
          ? 'border-primary-container bg-primary-container text-on-primary'
          : `border-outline-variant bg-surface-container-lowest ${
              d.conEventos || d.clave === 'todos' ? 'text-on-surface' : 'text-outline'
            }`;
        return (
          <button
            key={d.clave}
            type="button"
            aria-pressed={activo}
            aria-label={d.nombre}
            onClick={() => alElegir(d.clave)}
            className={`toque flex min-h-[64px] min-w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-space-sm ${color}`}
          >
            <span className="text-[12px] font-semibold">{d.arriba}</span>
            <span className="text-[19px] leading-none font-extrabold tabular-nums">{d.numero}</span>
            {d.conEventos && (
              <span
                data-punto
                aria-hidden="true"
                className={`h-[5px] w-[5px] rounded-full ${activo ? 'bg-primary-fixed' : 'bg-surface-tint'}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
