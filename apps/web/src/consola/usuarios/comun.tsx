import { useState } from 'react';
import type { EstadoUsuario, RolInterno } from '../../api/usuarios';
import { Boton } from '../../componentes/Boton';
import { Icono } from '../../componentes/Icono';

export const ROLES: { rol: RolInterno; nombre: string; descripcion: string }[] = [
  {
    rol: 'OPERADOR',
    nombre: 'Operador',
    descripcion: 'Registra entradas, saldos y despachos en su acopio',
  },
  {
    rol: 'RECEPTOR',
    nombre: 'Receptor',
    descripcion: 'Confirma lo que llega a su zona y reporta necesidades',
  },
  { rol: 'AUDITOR', nombre: 'Auditor', descripcion: 'Concilia donaciones y consulta la bitácora' },
  {
    rol: 'ADMIN',
    nombre: 'Administrador',
    descripcion: 'Usuarios, emergencias, catálogo y remisiones',
  },
];

export const ESTADOS: Record<EstadoUsuario, { texto: string; icono: string; clases: string }> = {
  ACTIVO: { texto: 'Activo', icono: 'check_circle', clases: 'bg-exito-container text-exito' },
  INVITADO: {
    texto: 'Invitación pendiente',
    icono: 'pending',
    clases: 'bg-tertiary-fixed text-tertiary-container',
  },
  SUSPENDIDO: {
    texto: 'Suspendido',
    icono: 'block',
    clases: 'bg-error-container text-on-error-container',
  },
};

export function DistintivoEstado({ estado }: { estado: EstadoUsuario }) {
  const e = ESTADOS[estado];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-md ${e.clases}`}
    >
      <Icono nombre={e.icono} className="text-[16px]" />
      {e.texto}
    </span>
  );
}

/** El enlace de una invitación o un restablecimiento, para copiar o mandar por WhatsApp
 *  (RF-IDE-002). */
export function CompartirEnlace({ enlace, nombre }: { enlace: string; nombre: string }) {
  const [copiado, fijarCopiado] = useState(false);
  const campo = `enlace-${nombre.replace(/\W+/g, '-')}`;
  const mensaje = `Hola ${nombre}, este es tu enlace para entrar a Acopio: ${enlace}`;
  return (
    <div className="flex flex-col gap-space-sm">
      <label htmlFor={campo} className="text-label-md text-on-surface">
        Enlace
      </label>
      <div className="flex gap-space-xs">
        <input
          id={campo}
          readOnly
          value={enlace}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-[48px] min-w-0 flex-1 rounded-xl bg-surface-container-low px-space-md text-body-sm text-on-surface"
        />
        <Boton
          variante="secundario"
          aria-label="Copiar enlace"
          onClick={() => {
            navigator.clipboard?.writeText(enlace).then(
              () => fijarCopiado(true),
              () => fijarCopiado(false),
            );
          }}
        >
          <Icono nombre="content_copy" className="text-[18px]" />
          {copiado ? 'Copiado' : 'Copiar'}
        </Boton>
      </div>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-[48px] items-center justify-center gap-space-xs rounded-xl bg-primary-container px-space-md text-label-md text-on-primary"
      >
        <Icono nombre="send" className="text-[18px]" />
        Compartir por WhatsApp
      </a>
      <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
        <Icono nombre="timer" className="text-[16px]" />
        El enlace vence en 7 días y sirve una sola vez.
      </p>
    </div>
  );
}
