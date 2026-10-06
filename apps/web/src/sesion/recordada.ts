import type { UsuarioSesion } from './cliente-auth';

/**
 * El último usuario con sesión, para dejar capturar sin red (O-05). Guarda solo quién
 * es; el token vive en la cookie HttpOnly y la web nunca lo ve (ADR-0014). Si el
 * navegador no deja usar localStorage, no se recuerda a nadie.
 */
const LLAVE = 'acopio.ultimo-usuario';

export function recordarUsuario({ id, username, nombre, rol }: UsuarioSesion) {
  try {
    localStorage.setItem(LLAVE, JSON.stringify({ id, username, nombre, rol }));
  } catch {
    // Sin almacenamiento, sin red no habrá sesión: igual que antes de este ciclo
  }
}

export function leerRecordado(): UsuarioSesion | null {
  try {
    const guardado = JSON.parse(localStorage.getItem(LLAVE) ?? 'null') as UsuarioSesion | null;
    return guardado?.id && guardado.rol ? guardado : null;
  } catch {
    return null;
  }
}

export function olvidarUsuario() {
  try {
    localStorage.removeItem(LLAVE);
  } catch {
    // Nada que olvidar
  }
}
