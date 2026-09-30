import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorApi } from '../api/cliente';
import { canjearInvitacion, useInvitacion, type Invitacion } from '../api/invitaciones';
import { Boton } from '../componentes/Boton';
import { Esqueleto } from '../componentes/Esqueleto';
import { Icono } from '../componentes/Icono';
import type { Rol } from '../sesion/cliente-auth';
import { nombreRol } from '../sesion/roles';
import { AlertaError } from './AlertaError';
import { CampoContrasena } from './CampoContrasena';

const VolverPortada = () => (
  <Link
    to="/"
    className="flex min-h-[48px] items-center justify-center gap-space-xs text-label-md text-primary-container"
  >
    <Icono nombre="arrow_back" className="text-[18px]" />
    Volver a la portada
  </Link>
);

// Los nombres de acopios y zonas llegan en el Bloque 1; por ahora, la cantidad
function ubicaciones(inv: Invitacion): string {
  if (inv.rol === 'ADMIN') return 'Todas';
  const n = inv.asignaciones.length;
  return n === 1 ? '1 ubicación asignada' : `${n} ubicaciones asignadas`;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-space-md border-t border-outline-variant py-space-sm first:border-t-0">
      <dt className="text-body-sm text-on-surface-variant">{etiqueta}</dt>
      <dd className="text-right text-label-md text-on-surface">{valor}</dd>
    </div>
  );
}

/** C01 Activar cuenta (RF-IDE-003). Diseño: docs/03-diseno/stitch/C01-activar. */
export function ActivarCuenta() {
  const { token = '' } = useParams();
  const { data: invitacion, error, isPending } = useInvitacion(token);
  const navegar = useNavigate();
  const [contrasena, fijarContrasena] = useState('');
  const [confirmacion, fijarConfirmacion] = useState('');
  const [fallo, fijarFallo] = useState<string | null>(null);
  const [enviando, fijarEnviando] = useState(false);

  const restablecer = invitacion?.esRestablecimiento ?? false;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    if (contrasena !== confirmacion) {
      fijarFallo('Las contraseñas no coinciden.');
      return;
    }
    fijarEnviando(true);
    fijarFallo(null);
    try {
      const username = await canjearInvitacion(token, contrasena);
      navegar(`/entrar?usuario=${encodeURIComponent(username)}`, { replace: true });
    } catch (err) {
      fijarFallo(err instanceof ErrorApi ? err.message : 'No se pudo activar la cuenta.');
      fijarEnviando(false);
    }
  }

  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-space-xs bg-primary px-margin pt-space-lg pb-space-lg text-on-primary">
        {/* Título neutro hasta saber si es una invitación o un restablecimiento */}
        <h1 className="text-headline-lg-mobile tracking-tight">
          {!invitacion
            ? 'Tu acceso a Acopio'
            : restablecer
              ? 'Restablece tu contraseña'
              : 'Activa tu cuenta'}
        </h1>
        {invitacion && (
          <p className="text-primary-fixed-dim">
            {restablecer
              ? 'Un administrador restableció tu acceso a la consola de Acopio.'
              : 'Un administrador te invitó a la consola de Acopio.'}
          </p>
        )}
      </section>

      <div className="flex flex-col gap-space-md px-margin py-space-lg">
        {isPending && <Esqueleto etiqueta="Cargando la invitación" className="h-40" />}

        {error && <AlertaError mensaje={error.message} />}

        {invitacion && (
          <>
            <section
              aria-labelledby="datos-invitacion"
              className="rounded-xl bg-surface-container-lowest p-space-md shadow-md"
            >
              <h2
                id="datos-invitacion"
                className="pb-space-xs text-label-caps tracking-wider text-on-surface-variant uppercase"
              >
                Datos de la invitación
              </h2>
              <dl>
                <Dato etiqueta="Usuario" valor={(invitacion.username as unknown as string) ?? ''} />
                <Dato etiqueta="Nombre" valor={invitacion.nombre} />
                <Dato etiqueta="Rol" valor={nombreRol(invitacion.rol as Rol)} />
                <Dato etiqueta="Ubicaciones" valor={ubicaciones(invitacion)} />
              </dl>
            </section>

            <form
              onSubmit={enviar}
              className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-md"
            >
              <CampoContrasena
                id="contrasena"
                etiqueta="Contraseña"
                valor={contrasena}
                alCambiar={fijarContrasena}
                ayuda="Mínimo 12 caracteres. Puede ser una frase; no hace falta usar símbolos."
                autoComplete="new-password"
              />
              <CampoContrasena
                id="confirmacion"
                etiqueta="Repite la contraseña"
                valor={confirmacion}
                alCambiar={fijarConfirmacion}
                autoComplete="new-password"
              />
              <Boton type="submit" disabled={enviando} className="min-h-[56px] w-full">
                {enviando ? 'Guardando…' : restablecer ? 'Guardar contraseña' : 'Activar mi cuenta'}
              </Boton>
              {fallo && <AlertaError mensaje={fallo} />}
            </form>
          </>
        )}

        <VolverPortada />
      </div>
    </div>
  );
}
