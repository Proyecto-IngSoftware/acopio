import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AlertaError } from '../acceso/AlertaError';
import { CampoContrasena } from '../acceso/CampoContrasena';
import { ErrorApi } from '../api/cliente';
import { Boton, EnlaceBoton } from '../componentes/Boton';
import { Campo } from '../componentes/Campo';
import { Esqueleto } from '../componentes/Esqueleto';
import { Icono } from '../componentes/Icono';
import { useSesion } from '../sesion/Sesion';

type Enlace = { nombre: string; correo: string };

const ENLACE_VENCIDO =
  'Este enlace ya no sirve: venció o ya se usó. Crea la cuenta otra vez para recibir uno nuevo.';

/** P13 Confirmar correo: el Donador elige su contraseña desde el enlace del correo.
 *  Diseño: docs/03-diseno/stitch/P13-confirmar/README.md. */
export function Confirmar() {
  const { token = '' } = useParams();
  const { validarEnlace, confirmar } = useSesion();
  const navegar = useNavigate();
  // undefined: validando; null: el enlace no sirve
  const [enlace, fijarEnlace] = useState<Enlace | null | undefined>(undefined);
  const [errorValidar, fijarErrorValidar] = useState<string | null>(null);
  const [nombre, fijarNombre] = useState('');
  const [contrasena, fijarContrasena] = useState('');
  const [repeticion, fijarRepeticion] = useState('');
  const [fallo, fijarFallo] = useState<string | null>(null);
  const [enviando, fijarEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    validarEnlace(token)
      .then((r) => {
        if (!vigente) return;
        fijarEnlace(r);
        if (r) fijarNombre(r.nombre);
      })
      .catch((e) => {
        if (!vigente) return;
        fijarErrorValidar(e instanceof ErrorApi ? e.message : 'No pudimos conectar con Acopio.');
        fijarEnlace(null);
      });
    return () => {
      vigente = false;
    };
  }, [token, validarEnlace]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    if (contrasena !== repeticion) {
      fijarFallo('Las contraseñas no coinciden.');
      return;
    }
    fijarEnviando(true);
    fijarFallo(null);
    try {
      await confirmar(token, contrasena, nombre.trim() || undefined);
      navegar('/donador', { replace: true });
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 404) {
        fijarEnlace(null);
        return;
      }
      fijarFallo(err instanceof ErrorApi ? err.message : 'No pudimos conectar con Acopio.');
      fijarEnviando(false);
    }
  }

  if (enlace === undefined) {
    return (
      <section className="flex flex-col gap-space-md px-margin py-space-lg">
        <Esqueleto etiqueta="Validando el enlace" className="h-56" />
      </section>
    );
  }

  if (enlace === null) {
    return (
      <section className="flex flex-col gap-space-md px-margin py-space-lg">
        <p
          role="alert"
          className="flex items-start gap-space-xs rounded-xl border border-error bg-error-container p-space-sm text-body-sm text-on-error-container"
        >
          <Icono nombre="link_off" className="text-[20px] text-error" />
          <span>{errorValidar ?? ENLACE_VENCIDO}</span>
        </p>
        <EnlaceBoton a="/donador" variante="secundario" className="min-h-[56px] w-full">
          Ir a crear cuenta
        </EnlaceBoton>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-space-md px-margin py-space-lg">
      <div className="flex flex-col gap-space-xs">
        <h1 className="text-headline-lg-mobile text-on-surface">Elige tu contraseña</h1>
        <p className="text-body-md text-on-surface-variant">
          Confirmaste el correo <b className="text-on-surface">{enlace.correo}</b>. Ahora elige la
          contraseña con la que vas a entrar.
        </p>
      </div>
      <form onSubmit={enviar} className="flex flex-col gap-space-md">
        <Campo
          id="nombre"
          etiqueta="Nombre"
          value={nombre}
          onChange={(e) => fijarNombre(e.target.value)}
          autoComplete="name"
          required
        />
        <CampoContrasena
          id="contrasena"
          etiqueta="Contraseña"
          valor={contrasena}
          alCambiar={fijarContrasena}
          ayuda="Mínimo 12 caracteres. Evita tu nombre o tu correo."
          autoComplete="new-password"
        />
        <CampoContrasena
          id="repeticion"
          etiqueta="Repite la contraseña"
          valor={repeticion}
          alCambiar={fijarRepeticion}
          autoComplete="new-password"
        />
        {fallo && <AlertaError mensaje={fallo} />}
        <Boton type="submit" disabled={enviando} className="min-h-[56px] w-full">
          {enviando ? 'Guardando…' : 'Guardar y entrar'}
        </Boton>
      </form>
      <Link
        to="/privacidad"
        className="flex min-h-[48px] items-center justify-center gap-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="shield" className="text-[20px]" />
        Cómo usamos tus datos
      </Link>
    </section>
  );
}
