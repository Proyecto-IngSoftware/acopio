import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { ErrorApi } from '../api/cliente';
import { Boton } from '../componentes/Boton';
import { Icono } from '../componentes/Icono';
import { useSesion } from '../sesion/Sesion';
import { rutaDeVuelta } from '../sesion/volver';
import { AlertaError } from './AlertaError';
import { CampoContrasena } from './CampoContrasena';

const CREDENCIALES = 'Usuario o contraseña incorrectos.';

/** C01 Entrar, la única pantalla de entrada para todas las cuentas.
 *  Diseño: docs/03-diseno/stitch/C01-acceso. */
export function Entrar() {
  const { usuario, cargando, entrar } = useSesion();
  const [parametros] = useSearchParams();
  const [nombre, fijarNombre] = useState(parametros.get('usuario') ?? '');
  const [contrasena, fijarContrasena] = useState('');
  const [error, fijarError] = useState<string | null>(null);
  const [enviando, fijarEnviando] = useState(false);

  if (!cargando && usuario) {
    // Con sesión, cada cuenta va a lo suyo, o vuelve a la página que pidió entrar
    const destino =
      rutaDeVuelta(parametros.get('volver')) ?? (usuario.rol === 'DONADOR' ? '/donador' : '/');
    return <Navigate to={destino} replace />;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    fijarEnviando(true);
    fijarError(null);
    try {
      // Al quedar la sesión abierta, la pantalla redirige sola (arriba)
      await entrar(nombre.trim(), contrasena);
    } catch (err) {
      // RF-IDE-004: el mismo mensaje para cualquier credencial mala; el límite de
      // intentos sí se explica, con el texto de la API
      fijarError(err instanceof ErrorApi && err.estado === 429 ? err.message : CREDENCIALES);
      fijarEnviando(false);
    }
  }

  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-space-xs bg-primary px-margin pt-space-lg pb-space-lg text-on-primary">
        <h1 className="text-headline-lg-mobile tracking-tight">Entrar a Acopio</h1>
        <p className="text-primary-fixed-dim">
          Para donadores y para quienes trabajan en un acopio.
        </p>
      </section>

      <div className="flex flex-col gap-space-md px-margin py-space-lg">
        <form
          onSubmit={enviar}
          className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-md"
        >
          <div className="flex flex-col gap-space-xs">
            <label htmlFor="usuario" className="text-label-md text-on-surface">
              Correo o nombre de usuario
            </label>
            <input
              id="usuario"
              value={nombre}
              onChange={(e) => fijarNombre(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              aria-describedby="usuario-ayuda"
              className="min-h-[48px] rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-md text-body-md text-on-surface focus:border-primary-container"
            />
            <p id="usuario-ayuda" className="text-body-sm text-on-surface-variant">
              Si donas, tu correo. Si trabajas en un acopio, el usuario que te dio el administrador.
            </p>
          </div>
          <CampoContrasena
            id="contrasena"
            etiqueta="Contraseña"
            valor={contrasena}
            alCambiar={fijarContrasena}
            autoComplete="current-password"
          />
          <Boton type="submit" disabled={enviando} className="min-h-[56px] w-full">
            {enviando ? 'Entrando…' : 'Entrar'}
          </Boton>
          {error && <AlertaError mensaje={error} />}
        </form>

        <p className="text-body-md text-on-surface-variant">
          ¿Vas a donar y no tienes cuenta?{' '}
          <Link to="/donador" className="font-semibold text-primary-container underline">
            Crea tu cuenta de donador
          </Link>
        </p>

        <section className="flex flex-col gap-space-xs rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <h2 className="text-headline-sm text-on-surface">¿Olvidaste tu contraseña?</h2>
          <p className="text-on-surface-variant">
            Pídele a un administrador que restablezca tu acceso. Te llegará un enlace nuevo.
          </p>
        </section>

        <Link
          to="/"
          className="flex min-h-[48px] items-center justify-center gap-space-xs text-label-md text-primary-container"
        >
          <Icono nombre="arrow_back" className="text-[18px]" />
          Volver a la portada
        </Link>
      </div>
    </div>
  );
}
