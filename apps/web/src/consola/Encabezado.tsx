import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icono } from '../componentes/Icono';

interface Props {
  titulo: string;
  /** Una línea bajo el título. */
  subtitulo?: string;
  volverA?: string;
  /** Acciones a la derecha del título. */
  children?: ReactNode;
}

/** Encabezado de las herramientas: «Volver», título y acciones. */
export function Encabezado({ titulo, subtitulo, volverA = '/mas', children }: Props) {
  return (
    <div className="flex flex-col gap-space-xs">
      <Link
        to={volverA}
        className="-ml-space-xs flex min-h-[44px] w-fit items-center gap-space-xs px-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="arrow_back" className="text-[20px]" />
        Volver
      </Link>
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex min-w-0 flex-col">
          <h1 className="text-headline-md text-on-surface">{titulo}</h1>
          {subtitulo && <p className="text-body-sm text-on-surface-variant">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
