import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

type S = components['schemas'];
export type Usuario = Omit<S['UsuarioDto'], 'username' | 'correo'> & {
  // El contrato tipa estos campos como arreglos (P-031); llegan como texto o null
  username: string | null;
  correo: string | null;
};
export type EstadoUsuario = Usuario['estado'];
export type RolInterno = S['CrearUsuarioDto']['rol'];
export type Enlace = S['EnlaceInvitacionDto'];
export type Asignacion = { tipo: 'ACOPIO' | 'ZONA'; ubicacionId: string };

export function useUsuarios(filtro: { rol?: RolInterno; estado?: EstadoUsuario; q: string }) {
  const q = filtro.q.trim();
  return useQuery<Usuario[], ErrorApi>({
    queryKey: ['usuarios', filtro.rol, filtro.estado, q],
    queryFn: async () =>
      (await desenvolver(
        api.GET('/api/usuarios', {
          params: { query: { rol: filtro.rol, estado: filtro.estado, q: q || undefined } as never },
        }),
      )) as unknown as Usuario[],
  });
}

export function useUsuario(id: string) {
  return useQuery<Usuario, ErrorApi>({
    queryKey: ['usuarios', id],
    queryFn: async () =>
      (await desenvolver(
        api.GET('/api/usuarios/{id}', { params: { path: { id } } }),
      )) as unknown as Usuario,
  });
}

function useCambio<T, R>(hacer: (datos: T) => Promise<R>) {
  const consultas = useQueryClient();
  return useMutation<R, ErrorApi, T>({
    mutationFn: hacer,
    onSuccess: () => void consultas.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

const ruta = (id: string) => ({ params: { path: { id } } });

export const useCrearUsuario = () =>
  useCambio(
    async (datos: {
      nombre: string;
      username: string;
      rol: RolInterno;
      correo: string | null;
      asignaciones: Asignacion[];
    }) =>
      (await desenvolver(api.POST('/api/usuarios', { body: datos as never }))) as unknown as {
        usuario: Usuario;
        invitacion: Enlace;
      },
  );
export const useCambiarRol = () =>
  useCambio(({ id, rol }: { id: string; rol: RolInterno }) =>
    desenvolver(api.PATCH('/api/usuarios/{id}', { ...ruta(id), body: { rol } as never })),
  );
export const useSuspender = () =>
  useCambio((id: string) => desenvolver(api.POST('/api/usuarios/{id}/suspender', ruta(id))));
export const useReactivar = () =>
  useCambio((id: string) => desenvolver(api.POST('/api/usuarios/{id}/reactivar', ruta(id))));
export const useRestablecer = () =>
  useCambio(({ id, motivo }: { id: string; motivo: string }) =>
    desenvolver(api.POST('/api/usuarios/{id}/restablecer', { ...ruta(id), body: { motivo } })),
  );
export const useReenviarInvitacion = () =>
  useCambio((id: string) => desenvolver(api.POST('/api/usuarios/{id}/invitacion', ruta(id))));
export const useAsignar = () =>
  useCambio(({ id, asignacion }: { id: string; asignacion: Asignacion }) =>
    desenvolver(
      api.POST('/api/usuarios/{id}/asignaciones', { ...ruta(id), body: asignacion as never }),
    ),
  );
/** Con `confirmar`, la quita aunque la ubicación quede sin responsable (409 en la API). */
export const useDesasignar = () =>
  useCambio(
    ({ id, asignacion, confirmar }: { id: string; asignacion: Asignacion; confirmar?: boolean }) =>
      desenvolver(
        api.DELETE('/api/usuarios/{id}/asignaciones/{tipo}/{ubicacionId}', {
          params: {
            path: { id, tipo: asignacion.tipo, ubicacionId: asignacion.ubicacionId },
            query: (confirmar ? { confirmar: 'true' } : {}) as never,
          },
        }),
      ),
  );
