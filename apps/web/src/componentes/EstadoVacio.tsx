import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  children: ReactNode;
}

/** Un bloque sin datos dice qué mostrará y por qué está vacío. Nunca queda en blanco. */
export function EstadoVacio({ titulo, children }: Props) {
  return (
    <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">
      <p className="font-label-md text-label-md text-on-surface">{titulo}</p>
      <p>{children}</p>
    </div>
  );
}
