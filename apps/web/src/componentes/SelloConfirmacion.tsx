interface Props {
  etiqueta: string;
  className?: string;
}

/** Sello de una acción confirmada: el círculo crece, el aro se dibuja y el check se traza.
 *  Con «reducir movimiento» aparece completo de una vez. */
export function SelloConfirmacion({ etiqueta, className = '' }: Props) {
  return (
    <svg
      role="img"
      aria-label={etiqueta}
      viewBox="0 0 60 60"
      width="72"
      height="72"
      className={`sello ${className}`}
    >
      <circle cx="30" cy="30" r="27" className="fill-primary-fixed" />
      <circle
        cx="30"
        cy="30"
        r="27"
        fill="none"
        strokeWidth="3"
        transform="rotate(-90 30 30)"
        className="sello-aro stroke-primary-container"
      />
      <path
        d="M19 31 l7 7 l15 -16"
        fill="none"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sello-check stroke-primary-container"
      />
    </svg>
  );
}
