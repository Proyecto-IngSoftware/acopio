import { api, desenvolver, ErrorApi } from '../api/cliente';
import type { components } from '../api/esquema';

export type Rol = components['schemas']['YoDto']['rol'];

export interface UsuarioSesion {
  id: string;
  username: string | null;
  nombre: string;
  rol: Rol;
}

/** La única puerta de la web a la autenticación (D-06, ADR-0014). Cambiar de proveedor
 *  es cambiar esta implementación; las pantallas no llaman a /auth/* directamente. */
export interface ClienteAuth {
  iniciarSesion(usuario: string, contrasena: string): Promise<UsuarioSesion>;
  cerrarSesion(): Promise<void>;
  /** El usuario de la cookie actual, o null si no hay sesión. */
  usuarioActual(): Promise<UsuarioSesion | null>;
  /** Pide el correo de confirmación del registro del Donador. */
  registrarDonador(nombre: string, correo: string): Promise<void>;
  /** Datos del enlace de confirmación, o null si no sirve (404). */
  validarEnlace(token: string): Promise<{ nombre: string; correo: string } | null>;
  /** Confirma el correo, fija la contraseña y abre la sesión. */
  confirmarCorreo(token: string, contrasena: string, nombre?: string): Promise<UsuarioSesion>;
  iniciarSesionDonador(correo: string, contrasena: string): Promise<UsuarioSesion>;
}

// El contrato tipa username como string[] por cómo nestjs-zod exporta los campos
// nullable (P-031); en la respuesta real es string o null.
const soloUsuario = ({ id, username, nombre, rol }: UsuarioSesion): UsuarioSesion => ({
  id,
  username: username ?? null,
  nombre,
  rol,
});

/** Implementación contra la API: la cookie la pone y la quita el servidor. */
export const clienteAuthLocal: ClienteAuth = {
  async iniciarSesion(usuario, contrasena) {
    const sesion = await desenvolver(
      api.POST('/api/auth/sesion', { body: { usuario, contrasena } }),
    );
    return soloUsuario(sesion.usuario as unknown as UsuarioSesion);
  },

  async cerrarSesion() {
    // Aunque falle, la web deja la sesión en nulo: el token vence solo en 8 horas
    await desenvolver(api.POST('/api/auth/salir')).catch(() => undefined);
  },

  async usuarioActual() {
    try {
      return soloUsuario((await desenvolver(api.GET('/api/auth/yo'))) as unknown as UsuarioSesion);
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 401) return null;
      throw e;
    }
  },

  async registrarDonador(nombre, correo) {
    await desenvolver(api.POST('/api/auth/registro', { body: { nombre, correo } }));
  },

  async validarEnlace(token) {
    try {
      const r = await desenvolver(
        api.GET('/api/auth/registro/confirmar/{token}', { params: { path: { token } } }),
      );
      return { nombre: r.nombre, correo: r.correo };
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 404) return null;
      throw e;
    }
  },

  async confirmarCorreo(token, contrasena, nombre) {
    const sesion = await desenvolver(
      api.POST('/api/auth/registro/confirmar', { body: { token, contrasena, nombre } }),
    );
    return soloUsuario(sesion.usuario as unknown as UsuarioSesion);
  },

  async iniciarSesionDonador(correo, contrasena) {
    const sesion = await desenvolver(
      api.POST('/api/auth/donador/sesion', { body: { correo, contrasena } }),
    );
    return soloUsuario(sesion.usuario as unknown as UsuarioSesion);
  },
};
