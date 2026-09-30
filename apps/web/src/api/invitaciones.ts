import { useQuery } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

export type Invitacion = components['schemas']['InvitacionPublicaDto'];

/** Datos públicos de una invitación (RF-IDE-003). Un enlace que no sirve responde 404. */
export function useInvitacion(token: string) {
  return useQuery<Invitacion, ErrorApi>({
    queryKey: ['invitacion', token],
    queryFn: () =>
      desenvolver(api.GET('/api/invitaciones/{token}', { params: { path: { token } } })),
    retry: false,
  });
}

/** Define la contraseña y activa la cuenta. Devuelve el nombre de usuario. */
export async function canjearInvitacion(token: string, contrasena: string): Promise<string> {
  const r = await desenvolver(
    api.POST('/api/invitaciones/{token}/canje', {
      params: { path: { token } },
      body: { contrasena },
    }),
  );
  // El contrato tipa username como arreglo (P-031); en la respuesta es un texto
  return r.username as unknown as string;
}
