import type { ReactNode } from 'react';
import { Boton } from '../../componentes/Boton';
import { Hoja } from '../../componentes/Hoja';
import { FormularioError } from '../catalogo/FormularioError';

/** Confirmación corta antes de publicar, renovar o reactivar (C-09). */
export function Confirmar({
  titulo,
  accion,
  ocupado,
  error,
  alConfirmar,
  alCerrar,
  children,
}: {
  titulo: string;
  accion: string;
  ocupado: boolean;
  error?: string;
  alConfirmar: () => void;
  alCerrar: () => void;
  children: ReactNode;
}) {
  return (
    <Hoja titulo={titulo} alCerrar={alCerrar}>
      {children}
      <FormularioError mensaje={error} />
      <Boton className="min-h-[56px] w-full" disabled={ocupado} onClick={alConfirmar}>
        {accion}
      </Boton>
      <Boton variante="secundario" className="min-h-[56px] w-full" onClick={alCerrar}>
        Revisar de nuevo
      </Boton>
    </Hoja>
  );
}

/** El párrafo que nombra la entidad y el dominio de destino, con la advertencia si no coinciden. */
export function DestinoCausa({
  entidad,
  dominio,
  dominioEntidad,
  verbo,
  distinto = false,
}: {
  entidad: string;
  dominio: string;
  dominioEntidad: string | null;
  verbo: string;
  /** Sin el sitio de la entidad a mano: la API ya dijo que el dominio no coincide. */
  distinto?: boolean;
}) {
  return (
    <>
      <p className="text-body-md text-on-surface-variant">
        Vas a {verbo} una causa de <strong className="text-on-surface">{entidad}</strong>. El botón
        llevará a <strong className="break-all text-on-surface">{dominio}</strong>. ¿Revisaste que
        ese sea el sitio oficial?
      </p>
      {(dominioEntidad || distinto) && (
        <p className="rounded-xl bg-primary-fixed p-space-sm text-label-md text-primary">
          {dominioEntidad
            ? `Ojo: el sitio de la entidad es ${dominioEntidad}.`
            : 'Ojo: este enlace no es del sitio de la entidad.'}
        </p>
      )}
    </>
  );
}
