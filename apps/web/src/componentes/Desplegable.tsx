import type { ReactNode } from 'react';

interface Props {
  abierto: boolean;
  className?: string;
  children: ReactNode;
}

/** Contenido que se despliega hacia abajo. Siempre está montado, así que anima al abrir y al
 *  cerrar; cerrado queda fuera del árbol de accesibilidad y no recibe el foco. */
export function Desplegable({ abierto, className = '', children }: Props) {
  return (
    <div
      className={`desplegable ${abierto ? 'abierto' : ''} ${className}`}
      aria-hidden={!abierto}
      inert={!abierto}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
