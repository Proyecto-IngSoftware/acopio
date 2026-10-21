import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { Icono } from './Icono';

type Variante = 'primario' | 'secundario' | 'terciario';
type Tamano = 'normal' | 'compacto';

// Clases de los botones de Stitch (sistema-diseno.md §2, ADR-0013). Inhabilitado va en gris
// sólido, sin transparencia, y `toque` lo hunde al presionarlo (línea visual, ADR-0022)
const BASE =
  'toque inline-flex items-center justify-center gap-space-xs rounded-xl font-label-md text-label-md ' +
  'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-container-high ' +
  'disabled:text-on-surface-variant disabled:shadow-none';
const POR_TAMANO: Record<Tamano, string> = {
  normal: 'min-h-[48px] px-space-md',
  compacto: 'min-h-[40px] px-space-sm',
};
const POR_VARIANTE: Record<Variante, string> = {
  primario: 'bg-primary-container text-on-primary shadow-sm active:bg-primary',
  secundario:
    'border-[1.5px] border-primary-container bg-surface-container-lowest text-primary-container',
  terciario: 'bg-surface-container-high text-primary',
};

const clases = (variante: Variante, tamano: Tamano, extra = '') =>
  `${BASE} ${POR_TAMANO[tamano]} ${POR_VARIANTE[variante]} ${extra}`;

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
  /** Mientras la acción corre: inhabilitado, con el ícono que gira y `aria-busy`. */
  ocupado?: boolean;
}

export function Boton({
  variante = 'primario',
  tamano = 'normal',
  ocupado = false,
  className,
  type = 'button',
  disabled,
  children,
  ...resto
}: PropsBoton) {
  return (
    <button
      type={type}
      className={clases(variante, tamano, className)}
      disabled={disabled || ocupado}
      aria-busy={ocupado || undefined}
      {...resto}
    >
      {ocupado && <Icono nombre="progress_activity" className="animate-spin text-[20px]" />}
      {children}
    </button>
  );
}

interface PropsEnlace {
  a: string;
  variante?: Variante;
  tamano?: Tamano;
  className?: string;
  children: ReactNode;
}

/** Un enlace con aspecto de botón: navega, así que es un <a> y no un <button>. */
export function EnlaceBoton({
  a,
  variante = 'primario',
  tamano = 'normal',
  className,
  children,
}: PropsEnlace) {
  return (
    <Link to={a} className={clases(variante, tamano, className)}>
      {children}
    </Link>
  );
}
