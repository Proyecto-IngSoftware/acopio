import { useCallback, useSyncExternalStore } from 'react';
import { useUbicacionesMias, type Ubicacion } from '../api/red';
import { useSesion } from './Sesion';

const oyentes = new Set<() => void>();
// Si el navegador no deja usar localStorage, la elección dura lo que dure la pestaña
const enMemoria = new Map<string, string>();

const llave = (usuarioId: string) => `acopio.ubicacion.${usuarioId}`;

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return enMemoria.get(clave) ?? null;
  }
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export interface UbicacionActiva {
  /** Las ubicaciones asignadas; vacío para el Administrador y el Auditor. */
  ubicaciones: Ubicacion[];
  activa: Ubicacion | null;
  elegir: (id: string) => void;
}

/** Dónde está operando la persona (RF-IDE-010, J-01). Es una comodidad de la interfaz:
 *  la API valida la ubicación en cada request. */
export function useUbicacionActiva(): UbicacionActiva {
  const { usuario } = useSesion();
  const conAsignaciones = usuario?.rol === 'OPERADOR' || usuario?.rol === 'RECEPTOR';
  const { data } = useUbicacionesMias(conAsignaciones);
  const clave = usuario ? llave(usuario.id) : null;
  const guardada = useSyncExternalStore(suscribir, () => (clave ? leer(clave) : null));

  const elegir = useCallback(
    (id: string) => {
      if (!clave) return;
      try {
        localStorage.setItem(clave, id);
      } catch {
        enMemoria.set(clave, id);
      }
      oyentes.forEach((o) => o());
    },
    [clave],
  );

  const ubicaciones = conAsignaciones ? (data ?? []) : [];
  const activa = ubicaciones.find((u) => u.id === guardada) ?? ubicaciones[0] ?? null;
  return { ubicaciones, activa, elegir };
}
