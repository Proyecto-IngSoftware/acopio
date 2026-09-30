import createClient from 'openapi-fetch';
import type { paths } from './esquema';

/** Error de la API con su forma { estado, codigo, mensaje }, o de red (estado 0). */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

const SIN_RED = 'No pudimos conectar con Acopio. Revisa tu conexión.';

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  // Se resuelve en cada llamada para que las pruebas puedan simular fetch
  fetch: (peticion) => globalThis.fetch(peticion),
});

/** Convierte lo que devuelve openapi-fetch en datos o en un ErrorApi. */
export async function desenvolver<T>(
  llamada: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let r: Awaited<typeof llamada>;
  try {
    r = await llamada;
  } catch {
    throw new ErrorApi(0, 'SIN_RED', SIN_RED);
  }
  if (r.data !== undefined && r.response.ok) return r.data;
  const e = (r.error ?? {}) as { codigo?: string; mensaje?: string };
  throw new ErrorApi(
    r.response.status,
    e.codigo ?? 'ERROR',
    e.mensaje ?? 'Algo falló al consultar Acopio. Intenta de nuevo.',
  );
}
