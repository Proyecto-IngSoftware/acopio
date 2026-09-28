import type { JSONWebKeySet } from 'jose';

/**
 * Lo único que la API le pide a quien autentica (P-025). Hoy lo implementa el
 * adaptador local; con Supabase, el adaptador supabase. El resto del sistema no
 * sabe cuál está activo.
 */
export interface ProveedorIdentidad {
  /** Crea la credencial y devuelve su identificador, que será el `sub` del token. */
  crearUsuario(correo: string, contrasena: string): Promise<{ uid: string }>;
  cambiarContrasena(uid: string, contrasena: string): Promise<void>;
  /** Devuelve null si el correo o la contraseña no coinciden. */
  iniciarSesion(correo: string, contrasena: string): Promise<SesionEmitida | null>;
  /** Llaves públicas para verificar los tokens. Con Supabase, las del proyecto. */
  jwks(): Promise<JSONWebKeySet>;
}

export interface SesionEmitida {
  accessToken: string;
  expiraEn: Date;
}

export const PROVEEDOR_IDENTIDAD = Symbol('PROVEEDOR_IDENTIDAD');
