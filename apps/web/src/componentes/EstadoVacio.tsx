import type { ReactNode } from 'react';
import { Ilustracion, type NombreIlustracion } from './ilustraciones/Ilustracion';

interface Props {
  titulo: string;
  children: ReactNode;
  /** Dibujo a la izquierda del texto (ADR-0022). */
  ilustracion?: NombreIlustracion;
}

/** Un bloque sin datos dice qué mostrará y por qué está vacío. Nunca queda en blanco. */
export function EstadoVacio({ titulo, children, ilustracion }: Props) {
  const texto = (
    <>
      <p className="font-label-md text-label-md text-on-surface">{titulo}</p>
      <p>{children}</p>
    </>
  );
  if (!ilustracion)
    return (
      <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">
        {texto}
      </div>
    );
  return (
    <div className="flex items-center gap-space-md rounded-xl bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">
      <Ilustracion nombre={ilustracion} className="w-24 shrink-0" />
      <div className="flex min-w-0 flex-col gap-space-xs">{texto}</div>
    </div>
  );
}
