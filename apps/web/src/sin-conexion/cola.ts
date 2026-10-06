import { api, desenvolver, ErrorApi } from '../api/cliente';
import type { DatosEntrada } from '../api/inventario';
import { abrir, type EnCola } from './base-local';

export type { EnCola } from './base-local';

export interface ResultadoEnvio {
  /** `listo`: no queda nada por enviar. `reintentar`: sin red, 429 o 5xx; se vuelve a
   *  intentar más tarde. `sin-sesion`: un 401; la cola espera a que vuelva a entrar. */
  estado: 'listo' | 'reintentar' | 'sin-sesion';
  enviadas: number;
}

async function siguienteOrden() {
  const base = await abrir();
  const cursor = await base.transaction('cola').store.index('orden').openCursor(null, 'prev');
  return (cursor?.value.orden ?? 0) + 1;
}

/** Guarda una entrada registrada sin red (O-02). Si el teléfono no deja guardar, falla. */
export async function encolar(
  usuarioId: string,
  acopioId: string,
  entrada: DatosEntrada,
  ocurridoEn = new Date(),
) {
  const fila: EnCola = {
    id: entrada.id,
    usuarioId,
    acopioId,
    cuerpo: { ...entrada, ocurridoEn: ocurridoEn.toISOString(), origenOffline: true },
    orden: await siguienteOrden(),
    estado: 'pendiente',
  };
  await (await abrir()).put('cola', fila);
}

/** Lo que espera envío o quedó rechazado, de quien está en el teléfono, en orden de envío. */
export async function listarCola(usuarioId: string): Promise<EnCola[]> {
  const filas = await (await abrir()).getAllFromIndex('cola', 'usuario', usuarioId);
  return filas.sort((a, b) => a.orden - b.orden);
}

export async function descartar(id: string) {
  await (await abrir()).delete('cola', id);
}

/** «Corregir» de una rechazada por la fecha: vuelve a la cola, de última. */
export async function corregirFecha(id: string, ocurridoEn: Date) {
  const base = await abrir();
  const fila = await base.get('cola', id);
  if (!fila) return;
  const { codigo: _c, motivo: _m, ...resto } = fila;
  await base.put('cola', {
    ...resto,
    cuerpo: { ...fila.cuerpo, ocurridoEn: ocurridoEn.toISOString() },
    orden: await siguienteOrden(),
    estado: 'pendiente',
  });
}

const enCurso = new Map<string, Promise<ResultadoEnvio>>();

/**
 * Envía las pendientes en orden, de a una (O-03), y borra cada una solo con un 2xx.
 * Un 401 detiene el envío; sin red, un 429 o un 5xx lo dejan para reintentar; cualquier
 * otro 4xx marca esa entrada como rechazada y sigue con la siguiente (O-04).
 */
export function enviarCola(
  usuarioId: string,
  alAvanzar?: (hechas: number, total: number) => void,
): Promise<ResultadoEnvio> {
  // Dos llamadas seguidas (el evento online y la vuelta a C4) comparten el mismo envío
  const previo = enCurso.get(usuarioId);
  if (previo) return previo;
  const envio = enviar(usuarioId, alAvanzar).finally(() => enCurso.delete(usuarioId));
  enCurso.set(usuarioId, envio);
  return envio;
}

async function enviar(
  usuarioId: string,
  alAvanzar?: (hechas: number, total: number) => void,
): Promise<ResultadoEnvio> {
  let enviadas = 0;
  const pendientes = (await listarCola(usuarioId)).filter((f) => f.estado === 'pendiente');
  for (const [i, fila] of pendientes.entries()) {
    alAvanzar?.(i, pendientes.length);
    try {
      await desenvolver(
        api.POST('/api/acopios/{id}/entradas', {
          params: { path: { id: fila.acopioId } },
          body: fila.cuerpo as never,
        }),
      );
    } catch (error) {
      const e = error instanceof ErrorApi ? error : new ErrorApi(0, 'SIN_RED', '');
      if (e.estado === 401) return { estado: 'sin-sesion', enviadas };
      if (e.estado === 0 || e.estado === 429 || e.estado >= 500) {
        return { estado: 'reintentar', enviadas };
      }
      const base = await abrir();
      await base.put('cola', { ...fila, estado: 'rechazada', codigo: e.codigo, motivo: e.message });
      continue;
    }
    await descartar(fila.id);
    enviadas += 1;
  }
  return { estado: 'listo', enviadas };
}

/** Espera antes del reintento número `intento`: 5 s, 10 s, 20 s… hasta 5 minutos (O-03). */
export function esperaReintento(intento: number) {
  return Math.min(5_000 * 2 ** intento, 300_000);
}
