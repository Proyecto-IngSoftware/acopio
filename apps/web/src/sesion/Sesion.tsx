import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { alPerderSesion, ErrorApi } from '../api/cliente';
import { clienteAuthLocal, type ClienteAuth, type UsuarioSesion } from './cliente-auth';
import { leerRecordado, olvidarUsuario, recordarUsuario } from './recordada';

interface EstadoSesion {
  usuario: UsuarioSesion | null;
  /** Verdadero mientras se pregunta a la API si hay sesión. */
  cargando: boolean;
  entrar(usuario: string, contrasena: string): Promise<void>;
  entrarDonador(correo: string, contrasena: string): Promise<void>;
  /** Pide el correo de confirmación del registro del Donador; no abre sesión. */
  registrarDonador(nombre: string, correo: string): Promise<void>;
  /** Confirma el correo del registro del Donador y abre su sesión. */
  confirmar(token: string, contrasena: string, nombre?: string): Promise<void>;
  salir(): Promise<void>;
}

const Contexto = createContext<EstadoSesion | null>(null);

/** Estado de sesión de la web. Pregunta a la API al arrancar (S-03) y, si la API
 *  responde 401 con una sesión abierta, la cierra y lleva a Entrar (S-04). */
export function SesionProveedor({
  cliente = clienteAuthLocal,
  children,
}: {
  cliente?: ClienteAuth;
  children: ReactNode;
}) {
  const [usuario, fijarUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, fijarCargando] = useState(true);
  const navegar = useNavigate();
  const usuarioActual = useRef<UsuarioSesion | null>(null);

  useEffect(() => {
    usuarioActual.current = usuario;
  }, [usuario]);

  useEffect(() => {
    let vigente = true;
    cliente
      .usuarioActual()
      .then((u) => {
        if (u) recordarUsuario(u);
        else olvidarUsuario();
        return u;
      })
      // Sin red sigue el último usuario recordado, para capturar sin conexión (O-05)
      .catch((e) => (e instanceof ErrorApi && e.estado === 0 ? leerRecordado() : null))
      .then((u) => vigente && fijarUsuario(u))
      .finally(() => vigente && fijarCargando(false));
    return () => {
      vigente = false;
    };
  }, [cliente]);

  // Sin sesión abierta un 401 no dice nada: el visitante sigue en el portal
  useEffect(
    () =>
      alPerderSesion(() => {
        const perdido = usuarioActual.current;
        if (!perdido) return;
        usuarioActual.current = null;
        olvidarUsuario();
        fijarUsuario(null);
        // Un Donador vuelve a su cuenta; la consola tiene su propia pantalla de entrada
        navegar(perdido.rol === 'DONADOR' ? '/donador' : '/entrar');
      }),
    [navegar],
  );

  const entrar = useCallback(
    async (nombre: string, contrasena: string) => {
      const u = await cliente.iniciarSesion(nombre, contrasena);
      recordarUsuario(u);
      fijarUsuario(u);
    },
    [cliente],
  );

  const entrarDonador = useCallback(
    async (correo: string, contrasena: string) => {
      const u = await cliente.iniciarSesionDonador(correo, contrasena);
      recordarUsuario(u);
      fijarUsuario(u);
    },
    [cliente],
  );

  const registrarDonador = useCallback(
    (nombre: string, correo: string) => cliente.registrarDonador(nombre, correo),
    [cliente],
  );

  const confirmar = useCallback(
    async (token: string, contrasena: string, nombre?: string) => {
      const u = await cliente.confirmarCorreo(token, contrasena, nombre);
      recordarUsuario(u);
      fijarUsuario(u);
    },
    [cliente],
  );

  const salir = useCallback(async () => {
    await cliente.cerrarSesion();
    olvidarUsuario();
    fijarUsuario(null);
  }, [cliente]);

  const valor = useMemo(
    () => ({ usuario, cargando, entrar, entrarDonador, registrarDonador, confirmar, salir }),
    [usuario, cargando, entrar, entrarDonador, registrarDonador, confirmar, salir],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): EstadoSesion {
  const estado = useContext(Contexto);
  if (!estado) throw new Error('useSesion necesita un SesionProveedor');
  return estado;
}
