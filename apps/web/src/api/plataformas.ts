import { useQuery } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

export type Plataforma = components['schemas']['PlataformaDto'];

/** Otras plataformas que ayudan (P14, pieza E), en el orden de su fuente. */
export function usePlataformas() {
  return useQuery<Plataforma[], ErrorApi>({
    queryKey: ['plataformas'],
    queryFn: async () => await desenvolver(api.GET('/api/publico/plataformas')),
  });
}
