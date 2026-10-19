import { useQuery } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

export type Plataforma = components['schemas']['PlataformaDto'];

/** Otras plataformas que ayudan, al final de Causas (P3), en el orden de su fuente. */
export function usePlataformas() {
  return useQuery<Plataforma[], ErrorApi>({
    queryKey: ['plataformas'],
    queryFn: async () => await desenvolver(api.GET('/api/publico/plataformas')),
  });
}

/** La versión va en la URL: una imagen reemplazada no sale de la caché del navegador. */
export const urlImagenPlataforma = (p: Plataforma) =>
  p.tieneImagen
    ? `/api/publico/plataformas/${p.id}/imagen?v=${encodeURIComponent(p.actualizadoEn)}`
    : null;
