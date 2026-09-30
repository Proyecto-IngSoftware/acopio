interface Props {
  /** Nombre del ícono de Material Symbols. Tiene que estar en icon_names de index.html. */
  nombre: string;
  relleno?: boolean;
  className?: string;
}

/** Ícono decorativo de Stitch. El texto que lo acompaña es el que se lee. */
export function Icono({ nombre, relleno = false, className = '' }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={relleno ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {nombre}
    </span>
  );
}
