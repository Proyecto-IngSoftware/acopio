import { createHash, randomBytes } from 'node:crypto';

/** Vigencia de una invitación o de un restablecimiento (RF-IDE-002). */
export const VIGENCIA_DIAS = 7;

/** Token de 32 bytes aleatorios, en base64url para ir en un enlace. */
export function generarToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Solo se guarda el SHA-256; el token en claro nunca se persiste. La búsqueda es por
 * igualdad del hash en un índice único: quien prueba tokens compara hashes de lo que
 * él mismo envía, así que no hay nada que filtrar por tiempo (RNF-08).
 */
export function hashToken(token: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(createHash('sha256').update(token, 'utf8').digest());
}

export function venceEn(desde = new Date()): Date {
  return new Date(desde.getTime() + VIGENCIA_DIAS * 24 * 3600 * 1000);
}
