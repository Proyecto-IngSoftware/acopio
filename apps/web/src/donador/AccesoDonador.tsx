import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertaError } from '../acceso/AlertaError';
import { ErrorApi } from '../api/cliente';
import { Boton, EnlaceBoton } from '../componentes/Boton';
import { Campo } from '../componentes/Campo';
import { Icono } from '../componentes/Icono';
import { useEnLinea } from '../sin-conexion/en-linea';
import { useSesion } from '../sesion/Sesion';

const SIN_RED = 'Sin conexión. Conéctate para continuar.';
const MENSAJE_SIN_RED = 'No pudimos conectar con Acopio. Revisa tu conexión.';

function Aviso({ icono, children, rol }: { icono: string; children: ReactNode; rol?: 'status' }) {
  return (
    <p
      role={rol}
      className="flex items-start gap-space-xs rounded-xl bg-primary-fixed p-space-sm text-body-sm text-on-primary-fixed-variant"
    >
      <Icono nombre={icono} className="text-[20px]" />
      <span>{children}</span>
    </p>
  );
}

/** P13 sin sesión: crear la cuenta de donador. Para entrar, todas las cuentas usan C01.
 *  Diseño: docs/03-diseno/stitch/P13-mi-cuenta. */
export function AccesoDonador() {
  const [registrado, fijarRegistrado] = useState(false);
  const enLinea = useEnLinea();

  return (
    <section className="flex flex-col gap-space-md px-margin py-space-lg">
      {registrado ? (
        <>
          <Aviso icono="mail" rol="status">
            Te enviamos un correo para confirmar tu cuenta. Revisa también la carpeta de spam.
          </Aviso>
          <p className="text-body-md text-on-surface-variant">
            Cuando confirmes el correo y elijas tu contraseña, entras desde «Entrar», con tu correo.
          </p>
          <EnlaceBoton a="/entrar" variante="secundario" className="min-h-[48px] w-full">
            Entrar
          </EnlaceBoton>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-space-xs">
            <h1 className="text-headline-lg-mobile text-on-surface">Crea tu cuenta de donador</h1>
            <p className="text-body-md text-on-surface-variant">
              Prepara tu donación antes de llevarla y síguela con su folio.
            </p>
          </div>
          <CrearCuenta enLinea={enLinea} alRegistrar={() => fijarRegistrado(true)} />
          <p className="text-body-md text-on-surface-variant">
            ¿Ya tienes cuenta?{' '}
            <Link to="/entrar" className="font-semibold text-primary-container underline">
              Entrar
            </Link>
          </p>
        </>
      )}
    </section>
  );
}

function CrearCuenta({ enLinea, alRegistrar }: { enLinea: boolean; alRegistrar: () => void }) {
  const { registrarDonador } = useSesion();
  const [nombre, fijarNombre] = useState('');
  const [correo, fijarCorreo] = useState('');
  const [error, fijarError] = useState<string | null>(null);
  const [enviando, fijarEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    fijarEnviando(true);
    fijarError(null);
    try {
      await registrarDonador(nombre.trim(), correo.trim());
      alRegistrar();
    } catch (err) {
      fijarError(err instanceof ErrorApi ? err.message : MENSAJE_SIN_RED);
      fijarEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-space-md">
      <Campo
        id="nombre"
        etiqueta="Nombre"
        value={nombre}
        onChange={(e) => fijarNombre(e.target.value)}
        placeholder="Ej. Camila Morales"
        autoComplete="name"
        required
      />
      <Campo
        id="correo"
        etiqueta="Correo"
        type="email"
        value={correo}
        onChange={(e) => fijarCorreo(e.target.value)}
        placeholder="nombre@correo.co"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
      />
      <Aviso icono="mark_email_unread">
        Te enviamos un enlace para confirmar el correo. Ahí eliges tu contraseña.
      </Aviso>
      <Link
        to="/privacidad"
        className="flex min-h-[48px] items-center gap-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="shield" className="text-[20px]" />
        Cómo usamos tus datos
      </Link>
      {error && <AlertaError mensaje={error} />}
      {!enLinea && <p className="text-body-sm text-on-surface-variant">{SIN_RED}</p>}
      <Boton type="submit" disabled={enviando || !enLinea} className="min-h-[56px] w-full">
        Crear cuenta de donador
      </Boton>
    </form>
  );
}
