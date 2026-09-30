interface Props {
  etiqueta: string;
  className?: string;
}

/** Marcador con la forma del contenido mientras carga. */
export function Esqueleto({ etiqueta, className = 'h-24' }: Props) {
  return (
    <div
      role="status"
      aria-label={etiqueta}
      className={`animate-pulse rounded-xl bg-surface-container-high ${className}`}
    />
  );
}
