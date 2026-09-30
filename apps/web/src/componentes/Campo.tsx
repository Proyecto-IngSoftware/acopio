import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const CLASES =
  'min-h-[48px] w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-md text-body-md text-on-surface focus:border-primary-container';

interface Base {
  id: string;
  etiqueta: string;
  ayuda?: string;
}

function Envoltura({ id, etiqueta, ayuda, children }: Base & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-space-xs">
      <label htmlFor={id} className="text-label-md text-on-surface">
        {etiqueta}
      </label>
      {children}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-body-sm text-on-surface-variant">
          {ayuda}
        </p>
      )}
    </div>
  );
}

/** Campo de texto con la etiqueta siempre visible encima (diseño de Stitch). */
export function Campo({
  id,
  etiqueta,
  ayuda,
  ...resto
}: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda}>
      <input
        id={id}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        className={CLASES}
        {...resto}
      />
    </Envoltura>
  );
}

export function Selector({
  id,
  etiqueta,
  ayuda,
  children,
  ...resto
}: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda}>
      <select
        id={id}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        className={CLASES}
        {...resto}
      >
        {children}
      </select>
    </Envoltura>
  );
}
