import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

type Variante = 'primario' | 'secundario' | 'terciario';

// Clases de los botones de Stitch (sistema-diseno.md §2, ADR-0013)
const BASE =
  'inline-flex min-h-[48px] items-center justify-center gap-space-xs rounded-xl px-space-md ' +
  'font-label-md text-label-md transition-colors disabled:cursor-not-allowed disabled:opacity-60';
const POR_VARIANTE: Record<Variante, string> = {
  primario: 'bg-primary-container text-on-primary shadow-sm active:bg-primary',
  secundario:
    'border-[1.5px] border-primary-container bg-surface-container-lowest text-primary-container',
  terciario: 'bg-surface-container-high text-primary',
};

const clases = (variante: Variante, extra = '') => `${BASE} ${POR_VARIANTE[variante]} ${extra}`;

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
}

export function Boton({ variante = 'primario', className, type = 'button', ...resto }: PropsBoton) {
  return <button type={type} className={clases(variante, className)} {...resto} />;
}

interface PropsEnlace {
  a: string;
  variante?: Variante;
  className?: string;
  children: ReactNode;
}

/** Un enlace con aspecto de botón: navega, así que es un <a> y no un <button>. */
export function EnlaceBoton({ a, variante = 'primario', className, children }: PropsEnlace) {
  return (
    <Link to={a} className={clases(variante, className)}>
      {children}
    </Link>
  );
}
