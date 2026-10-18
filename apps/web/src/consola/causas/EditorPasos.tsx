import { Icono } from '../../componentes/Icono';

const MAXIMO = 10;

/** Pasos numerados para donar: agregar, quitar y reordenar (RF-RED-007). */
export function EditorPasos({
  pasos,
  alCambiar,
}: {
  pasos: string[];
  alCambiar: (pasos: string[]) => void;
}) {
  const mover = (i: number, d: -1 | 1) => {
    const otro = [...pasos];
    [otro[i], otro[i + d]] = [otro[i + d]!, otro[i]!];
    alCambiar(otro);
  };
  const boton =
    'flex h-11 w-9 shrink-0 items-center justify-center text-on-surface-variant disabled:opacity-40';
  return (
    <fieldset className="flex flex-col gap-space-xs">
      <legend className="pb-space-xs text-label-md text-on-surface">Cómo donar</legend>
      <ol className="flex flex-col gap-space-xs">
        {pasos.map((paso, i) => (
          <li key={i} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md text-on-primary"
            >
              {i + 1}
            </span>
            <input
              aria-label={`Paso ${i + 1}`}
              value={paso}
              maxLength={300}
              required
              onChange={(e) => alCambiar(pasos.map((p, j) => (j === i ? e.target.value : p)))}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-sm text-body-md text-on-surface focus:border-primary-container"
            />
            <button
              type="button"
              aria-label={`Subir paso ${i + 1}`}
              disabled={i === 0}
              onClick={() => mover(i, -1)}
              className={boton}
            >
              <Icono nombre="arrow_upward" className="text-[20px]" />
            </button>
            <button
              type="button"
              aria-label={`Bajar paso ${i + 1}`}
              disabled={i === pasos.length - 1}
              onClick={() => mover(i, 1)}
              className={boton}
            >
              <Icono nombre="arrow_downward" className="text-[20px]" />
            </button>
            <button
              type="button"
              aria-label={`Quitar paso ${i + 1}`}
              disabled={pasos.length === 1}
              onClick={() => alCambiar(pasos.filter((_, j) => j !== i))}
              className={boton}
            >
              <Icono nombre="close" className="text-[20px]" />
            </button>
          </li>
        ))}
      </ol>
      {pasos.length < MAXIMO && (
        <button
          type="button"
          onClick={() => alCambiar([...pasos, ''])}
          className="flex min-h-[48px] items-center justify-center gap-space-xs rounded-xl border border-outline-variant text-label-md text-primary-container"
        >
          <Icono nombre="add" className="text-[20px]" />
          Agregar paso
        </button>
      )}
    </fieldset>
  );
}
