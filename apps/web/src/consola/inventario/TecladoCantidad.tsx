import { Icono } from '../../componentes/Icono';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'Borrar'] as const;
export type Tecla = (typeof TECLAS)[number];

/** «12,5» → 12.5. Vacío o inválido → 0. */
export const aNumero = (texto: string) => {
  const n = Number(texto.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Lo escrito con el teclado del equipo: el punto cuenta como coma, una sola coma, hasta 3
 *  decimales y solo cifras. Así «2.5» no se vuelve 25. */
export function limpiarCantidad(texto: string): string {
  const [entera = '', ...resto] = texto
    .replace(/\./g, ',')
    .replace(/[^\d,]/g, '')
    .split(',');
  return resto.length ? `${entera},${resto.join('').slice(0, 3)}` : entera;
}

/** Agrega una tecla a la cantidad: una sola coma y hasta 3 decimales. Sin decimales, la coma no cuenta. */
export function teclear(actual: string, tecla: Tecla, decimales = true): string {
  if (tecla === 'Borrar') return actual.slice(0, -1);
  if (tecla === ',') {
    if (!decimales) return actual;
    return actual.includes(',') ? actual : `${actual || '0'},`;
  }
  const parteDecimal = actual.split(',')[1];
  if (parteDecimal !== undefined && parteDecimal.length >= 3) return actual;
  return actual === '0' ? tecla : actual + tecla;
}

/** Teclado numérico de C4, C5 y C6. Sin decimales (categorías en UNIDAD) la coma no aparece. */
export function TecladoCantidad({
  onTecla,
  decimales = true,
}: {
  onTecla: (tecla: Tecla) => void;
  decimales?: boolean;
}) {
  return (
    <div role="group" aria-label="Teclado numérico" className="grid grid-cols-3 gap-space-xs">
      {TECLAS.map((t) =>
        t === ',' && !decimales ? (
          <span key={t} aria-hidden="true" />
        ) : (
          <button
            key={t}
            type="button"
            aria-label={t}
            onClick={() => onTecla(t)}
            className={`flex min-h-[56px] items-center justify-center rounded-xl border border-outline-variant text-headline-sm font-bold text-on-surface ${
              t === 'Borrar' ? 'bg-surface-container' : 'bg-surface-container-lowest'
            }`}
          >
            {t === 'Borrar' ? <Icono nombre="backspace" className="text-[24px]" /> : t}
          </button>
        ),
      )}
    </div>
  );
}
