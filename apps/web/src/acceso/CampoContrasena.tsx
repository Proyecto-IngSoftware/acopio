import { useState } from 'react';
import { Icono } from '../componentes/Icono';

interface Props {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  ayuda?: string;
  autoComplete: 'current-password' | 'new-password';
}

/** Campo de contraseña con el botón del ojo, como en el diseño de C01. */
export function CampoContrasena({ id, etiqueta, valor, alCambiar, ayuda, autoComplete }: Props) {
  const [visible, fijarVisible] = useState(false);
  return (
    <div className="flex flex-col gap-space-xs">
      <label htmlFor={id} className="text-label-md text-on-surface">
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={ayuda ? `${id}-ayuda` : undefined}
          required
          className="min-h-[48px] w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-md pr-14 text-body-md text-on-surface focus:border-primary-container"
        />
        <button
          type="button"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => fijarVisible(!visible)}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-on-surface-variant"
        >
          <Icono nombre={visible ? 'visibility_off' : 'visibility'} className="text-[22px]" />
        </button>
      </div>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-body-sm text-on-surface-variant">
          {ayuda}
        </p>
      )}
    </div>
  );
}
