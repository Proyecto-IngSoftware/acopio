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
import { alPerderSesion } from '../api/cliente';
import { clienteAuthLocal, type ClienteAuth, type UsuarioSesion } from './cliente-auth';

interface EstadoSesion {
  usuario: UsuarioSesion | null;
  /** Verdadero mientras se pregunta a la API si hay sesión. */
  cargando: boolean;
  entrar(usuario: string, contrasena: string): Promise<void>;
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
      .then((u) => vigente && fijarUsuario(u))
      .catch(() => vigente && fijarUsuario(null))
      .finally(() => vigente && fijarCargando(false));
    return () => {
      vigente = false;
    };
  }, [cliente]);

  // Sin sesión abierta un 401 no dice nada: el visitante sigue en el portal
  useEffect(
    () =>
      alPerderSesion(() => {
        if (!usuarioActual.current) return;
        usuarioActual.current = null;
        fijarUsuario(null);
        navegar('/entrar');
      }),
    [navegar],
  );

  const entrar = useCallback(
    async (nombre: string, contrasena: string) => {
      fijarUsuario(await cliente.iniciarSesion(nombre, contrasena));
    },
    [cliente],
  );

  const salir = useCallback(async () => {
    await cliente.cerrarSesion();
    fijarUsuario(null);
  }, [cliente]);

  const valor = useMemo(
    () => ({ usuario, cargando, entrar, salir }),
    [usuario, cargando, entrar, salir],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): EstadoSesion {
  const estado = useContext(Contexto);
  if (!estado) throw new Error('useSesion necesita un SesionProveedor');
  return estado;
}
