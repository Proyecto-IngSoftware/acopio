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

/** Encabezado de las herramientas: «Volver», título y acciones. Si el título y las acciones no
 *  caben en una fila (360 px), las acciones bajan: el título no se aprieta (regla de separación
 *  de `docs/02-arquitectura/patrones-y-practicas.md`). */
export function Encabezado({ titulo, subtitulo, volverA = '/mas', children }: Props) {
  return (
    <div className="flex flex-col gap-space-xs">
      <Link
        to={volverA}
        className="-ml-space-xs flex min-h-[48px] w-fit items-center gap-space-xs px-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="arrow_back" className="shrink-0 text-[20px]" />
        Volver
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-x-space-sm gap-y-space-xs">
        <div className="flex min-w-[12rem] flex-1 flex-col">
          <h1 className="text-headline-md text-on-surface">{titulo}</h1>
          {subtitulo && <p className="text-body-sm text-on-surface-variant">{subtitulo}</p>}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}
