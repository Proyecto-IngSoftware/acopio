import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icono } from './Icono';

interface PropsSeccion {
  id: string;
  titulo: string;
  /** Texto corto a la derecha del rótulo. */
  extra?: string;
  children: ReactNode;
}

/** Sección de «Más» y de las herramientas: rótulo y una tarjeta con filas. Diseño:
 *  docs/03-diseno/stitch/_compartidos/mas-opciones. */
export function SeccionMenu({ id, titulo, extra, children }: PropsSeccion) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between px-space-xs">
        <h2 id={id} className="text-label-caps tracking-wider text-primary uppercase">
          {titulo}
        </h2>
        {extra && <span className="text-label-md text-on-surface-variant">{extra}</span>}
      </div>
      <ul className="flex flex-col divide-y divide-outline-variant overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
        {children}
      </ul>
    </section>
  );
}

interface PropsFila {
  icono: string;
  titulo: string;
  descripcion?: string;
  /** Sin destino la fila solo informa. */
  a?: string;
  /** Contenido del recuadro en lugar del ícono (por ejemplo, iniciales). */
  distintivo?: ReactNode;
}

/** Fila con ícono en recuadro, título, una línea y chevron. */
export function FilaMenu({ icono, titulo, descripcion, a, distintivo }: PropsFila) {
  const contenido = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary-container">
        {distintivo ?? <Icono nombre={icono} className="text-[24px]" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-lg font-bold text-on-surface">{titulo}</span>
        {descripcion && (
          <span className="truncate text-body-md text-on-surface-variant">{descripcion}</span>
        )}
      </span>
      {a && <Icono nombre="chevron_right" className="text-[22px] text-outline" />}
    </>
  );
  const clases = 'flex min-h-[72px] items-center gap-space-md p-space-md';
  return (
    <li>
      {a ? (
        <Link to={a} className={`${clases} active:bg-surface-container`}>
          {contenido}
        </Link>
      ) : (
        <div className={clases}>{contenido}</div>
      )}
    </li>
  );
}
