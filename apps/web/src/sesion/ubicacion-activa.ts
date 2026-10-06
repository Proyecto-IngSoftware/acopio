import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useUbicacionesMias, type Ubicacion } from '../api/red';
import { useSesion } from './Sesion';

const oyentes = new Set<() => void>();
// Si el navegador no deja usar localStorage, la elección dura lo que dure la pestaña
const enMemoria = new Map<string, string>();

const llave = (usuarioId: string) => `acopio.ubicacion.${usuarioId}`;
const llaveAsignadas = (usuarioId: string) => `acopio.ubicaciones.${usuarioId}`;

/** Las asignaciones que llegaron la última vez con red, para operar sin conexión (O-05). */
function asignadasGuardadas(usuarioId: string): Ubicacion[] {
  try {
    return JSON.parse(localStorage.getItem(llaveAsignadas(usuarioId)) ?? '[]') as Ubicacion[];
  } catch {
    return [];
  }
}

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
  /** Las ubicaciones asignadas; vacío para el Administrador y el Donador. */
  ubicaciones: Ubicacion[];
  activa: Ubicacion | null;
  elegir: (id: string) => void;
}

/** Dónde está operando la persona (RF-IDE-010, J-01). Es una comodidad de la interfaz:
 *  la API valida la ubicación en cada request. */
export function useUbicacionActiva(): UbicacionActiva {
  const { usuario } = useSesion();
  // El Administrador tiene alcance global; el Donador no tiene ubicaciones
  const conAsignaciones = !!usuario && usuario.rol !== 'ADMIN' && usuario.rol !== 'DONADOR';
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

  useEffect(() => {
    if (!usuario || !data) return;
    try {
      localStorage.setItem(llaveAsignadas(usuario.id), JSON.stringify(data));
    } catch {
      // Sin almacenamiento, sin red no habrá ubicación
    }
  }, [usuario, data]);

  const ubicaciones = conAsignaciones ? (data ?? asignadasGuardadas(usuario.id)) : [];
  const activa = ubicaciones.find((u) => u.id === guardada) ?? ubicaciones[0] ?? null;
  return { ubicaciones, activa, elegir };
}
