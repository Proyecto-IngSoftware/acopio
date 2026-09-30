import { useQuery } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

export type Emergencia = components['schemas']['EmergenciaDto'];

/** Emergencias que el portal muestra: activas y en seguimiento, en el orden de la API. */
export function useEmergenciasVigentes() {
  return useQuery<Emergencia[], ErrorApi>({
    queryKey: ['emergencias', 'vigentes'],
    queryFn: async () => {
      const todas = await desenvolver(api.GET('/api/emergencias'));
      return todas.filter((e) => e.estado !== 'CERRADA');
    },
  });
}
