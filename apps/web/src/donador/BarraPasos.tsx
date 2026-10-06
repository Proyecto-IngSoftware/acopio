const PASOS = ['Qué llevas', 'Dónde entregar', 'Tu folio'];

/** La barra de tres pasos de P9; el actual va marcado y los anteriores, hechos. */
export function BarraPasos({ paso }: { paso: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Pasos" className="grid grid-cols-3 gap-space-xs">
      {PASOS.map((nombre, i) => {
        const n = i + 1;
        const actual = n === paso;
        return (
          <li
            key={nombre}
            aria-current={actual ? 'step' : undefined}
            className={`flex flex-col gap-space-2xs text-label-sm ${
              actual ? 'font-bold text-primary-container' : 'text-on-surface-variant'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1 rounded-full ${n <= paso ? 'bg-primary-container' : 'bg-outline-variant'}`}
            />
            <span>
              {n} {nombre}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
