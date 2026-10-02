import createClient from 'openapi-fetch';
import type { paths } from './esquema';

/** Error de la API con su forma { estado, codigo, mensaje, detalles? }, o de red (estado 0). */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    /** Datos para la interfaz en algunos errores; SALDO_INSUFICIENTE trae { saldo } */
    readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

const SIN_RED = 'No pudimos conectar con Acopio. Revisa tu conexión.';

export const api = createClient<paths>({
  // Mismo origen que la web (ADR-0014): en desarrollo Vite reenvía /api
  baseUrl: import.meta.env.VITE_API_URL || window.location.origin,
  // La sesión viaja en la cookie acopio_sesion
  credentials: 'include',
  // Se resuelve en cada llamada para que las pruebas puedan simular fetch
  fetch: (peticion) => globalThis.fetch(peticion),
});

const suscriptores = new Set<() => void>();

/** Avisa cada vez que la API responde 401 fuera del inicio de sesión. Devuelve cómo
 *  dejar de escuchar. Quien decide qué hacer con el aviso es el estado de sesión. */
export function alPerderSesion(fn: () => void): () => void {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

api.use({
  onResponse({ request, response }) {
    if (response.status === 401 && !new URL(request.url).pathname.endsWith('/api/auth/sesion')) {
      for (const fn of suscriptores) fn();
    }
  },
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
  const e = (r.error ?? {}) as { codigo?: string; mensaje?: string; detalles?: unknown };
  throw new ErrorApi(
    r.response.status,
    e.codigo ?? 'ERROR',
    e.mensaje ?? 'Algo falló al consultar Acopio. Intenta de nuevo.',
    e.detalles,
  );
}
