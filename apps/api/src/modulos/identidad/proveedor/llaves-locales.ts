import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  calculateJwkThumbprint,
  exportJWK,
  exportPKCS8,
  generateKeyPair,
  importPKCS8,
  type JWK,
  type KeyLike,
} from 'jose';

export const ALGORITMO = 'RS256';

export interface LlavesLocales {
  privada: KeyLike;
  publica: JWK;
}

/**
 * Par RS256 del adaptador local. Se genera la primera vez y se guarda en
 * AUTH_LLAVES_DIR para que los tokens sobrevivan a un reinicio de la API.
 */
export async function cargarOCrearLlaves(directorio: string): Promise<LlavesLocales> {
  const archivo = path.resolve(directorio, 'auth-local.pem');
  let pem: string;
  try {
    pem = await readFile(archivo, 'utf8');
  } catch {
    const par = await generateKeyPair(ALGORITMO, { extractable: true });
    pem = await exportPKCS8(par.privateKey);
    await mkdir(path.dirname(archivo), { recursive: true });
    await writeFile(archivo, pem, { mode: 0o600 });
  }
  const privada = await importPKCS8(pem, ALGORITMO, { extractable: true });
  const jwk = await exportJWK(privada);
  // La parte pública del par: módulo y exponente
  const publica: JWK = { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: ALGORITMO, use: 'sig' };
  publica.kid = await calculateJwkThumbprint(publica);
  return { privada, publica };
}
