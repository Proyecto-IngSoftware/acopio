import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertaError } from '../acceso/AlertaError';
import { CampoContrasena } from '../acceso/CampoContrasena';
import { ErrorApi } from '../api/cliente';
import { Boton } from '../componentes/Boton';
import { Campo } from '../componentes/Campo';
import { Icono } from '../componentes/Icono';
import { Segmentado } from '../componentes/Segmentado';
import { useEnLinea } from '../sin-conexion/en-linea';
import { useSesion } from '../sesion/Sesion';

type Pestana = 'crear' | 'entrar';

const CREDENCIALES = 'Correo o contraseña incorrectos.';
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

/** P13 sin sesión: crear cuenta o entrar como Donador. Diseño: docs/03-diseno/stitch/P13-mi-cuenta. */
export function AccesoDonador() {
  const [parametros] = useSearchParams();
  const [pestana, fijarPestana] = useState<Pestana>(parametros.has('entrar') ? 'entrar' : 'crear');
  const [registrado, fijarRegistrado] = useState(false);
  const enLinea = useEnLinea();

  return (
    <section className="flex flex-col gap-space-md px-margin py-space-lg">
      {registrado && pestana === 'entrar' && (
        <Aviso icono="mail" rol="status">
          Te enviamos un correo para confirmar tu cuenta. Revisa también la carpeta de spam.
        </Aviso>
      )}
      <div className="flex flex-col gap-space-xs">
        <h1 className="text-headline-lg-mobile text-on-surface">Tu cuenta de Donador</h1>
        <p className="text-body-md text-on-surface-variant">
          Prepara tu donación antes de llevarla y síguela con su folio.
        </p>
      </div>
      <Segmentado
        etiqueta="Acceso"
        valor={pestana}
        alCambiar={fijarPestana}
        opciones={[
          { valor: 'crear', texto: 'Crear cuenta' },
          { valor: 'entrar', texto: 'Entrar' },
        ]}
      />
      {pestana === 'crear' ? (
        <CrearCuenta
          enLinea={enLinea}
          alRegistrar={() => (fijarRegistrado(true), fijarPestana('entrar'))}
        />
      ) : (
        <EntrarDonador enLinea={enLinea} />
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
        Crear cuenta
      </Boton>
    </form>
  );
}

function EntrarDonador({ enLinea }: { enLinea: boolean }) {
  const { entrarDonador } = useSesion();
  const [correo, fijarCorreo] = useState('');
  const [contrasena, fijarContrasena] = useState('');
  const [error, fijarError] = useState<string | null>(null);
  const [enviando, fijarEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    fijarEnviando(true);
    fijarError(null);
    try {
      await entrarDonador(correo.trim(), contrasena);
    } catch (err) {
      // Solo un 401 son credenciales malas; cualquier otro error se explica con el texto de la API
      fijarError(err instanceof ErrorApi && err.estado !== 401 ? err.message : CREDENCIALES);
      fijarEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-space-md">
      <Campo
        id="correo-entrar"
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
      <CampoContrasena
        id="contrasena-entrar"
        etiqueta="Contraseña"
        valor={contrasena}
        alCambiar={fijarContrasena}
        autoComplete="current-password"
      />
      {error && <AlertaError mensaje={error} />}
      {!enLinea && <p className="text-body-sm text-on-surface-variant">{SIN_RED}</p>}
      <Boton type="submit" disabled={enviando || !enLinea} className="min-h-[56px] w-full">
        {enviando ? 'Entrando…' : 'Entrar'}
      </Boton>
      <p className="text-body-sm text-on-surface-variant">
        Si acabas de crear la cuenta, primero abre el enlace del correo y elige tu contraseña.
      </p>
    </form>
  );
}
