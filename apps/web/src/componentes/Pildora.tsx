/** Filtro de una sola opción activa (C16 y la matriz de acceso). */
export function Pildora({
  activa,
  texto,
  alTocar,
}: {
  activa: boolean;
  texto: string;
  alTocar: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={alTocar}
      className={`min-h-[40px] shrink-0 rounded-full px-space-md text-label-md ${
        activa
          ? 'bg-primary-container text-on-primary'
          : 'bg-surface-container text-on-surface-variant'
      }`}
    >
      {texto}
    </button>
  );
}
