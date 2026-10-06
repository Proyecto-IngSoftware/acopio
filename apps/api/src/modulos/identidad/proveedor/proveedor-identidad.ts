import type { JSONWebKeySet } from 'jose';

/**
 * Lo único que la API le pide a quien autentica (P-025). Hoy lo implementa el
 * adaptador local; con Supabase, el adaptador supabase. El resto del sistema no
 * sabe cuál está activo.
 */
export interface ProveedorIdentidad {
  /**
   * Crea la credencial y devuelve su identificador, que será el `sub` del token. Las
   * cuentas internas nacen confirmadas (la invitación prueba el correo); el Donador no.
   */
  crearUsuario(
    correo: string,
    contrasena: string,
    opciones?: { confirmado?: boolean },
  ): Promise<{ uid: string }>;
  /** Marca el correo como confirmado: desde ahí puede iniciar sesión. */
  confirmarCorreo(uid: string): Promise<void>;
  cambiarContrasena(uid: string, contrasena: string): Promise<void>;
  /** Borra la credencial: compensa un alta cuyo resto no se pudo guardar. */
  eliminarUsuario(uid: string): Promise<void>;
  /**
   * Devuelve null si el correo o la contraseña no coinciden. `sinConfirmar` solo sale
   * cuando la contraseña es correcta, para no revelar qué correos tienen cuenta.
   */
  iniciarSesion(
    correo: string,
    contrasena: string,
  ): Promise<SesionEmitida | { sinConfirmar: true } | null>;
  /** Llaves públicas para verificar los tokens. Con Supabase, las del proyecto. */
  jwks(): Promise<JSONWebKeySet>;
}

export interface SesionEmitida {
  accessToken: string;
  expiraEn: Date;
}

export const PROVEEDOR_IDENTIDAD = Symbol('PROVEEDOR_IDENTIDAD');
