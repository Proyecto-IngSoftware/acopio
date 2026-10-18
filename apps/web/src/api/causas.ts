import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';
import type { Entidad } from './red';

type S = components['schemas'];

export type CausaPublica = S['CausaPublicaDto'];
export type CausaGestion = S['CausaGestionDto'];
export type CategoriaCausa = CausaPublica['categoria'];
export type EstadoGestion = 'activas' | 'por-cerrar' | 'atendidas';

export interface DatosCausa {
  entidadId: string;
  categoria: CategoriaCausa;
  titulo: string;
  descripcion: string;
  pasos: string[];
  urlOficial: string;
  cierraEl: string;
}

/** La versión va en la URL: una imagen reemplazada no sale de la caché del navegador. */
const conVersion = (ruta: string, version: string) => `${ruta}?v=${encodeURIComponent(version)}`;

export const urlImagenCausa = (c: CausaPublica) =>
  c.tieneImagen ? conVersion(`/api/causas/${c.id}/imagen`, c.actualizadoEn) : null;

export const urlLogo = (entidad: { id: string; tieneLogo: boolean }, version = '') =>
  entidad.tieneLogo ? conVersion(`/api/entidades/${entidad.id}/logo`, version) : null;

// ── Público ──

export function useCausas(categoria?: CategoriaCausa) {
  return useQuery<CausaPublica[], ErrorApi>({
    queryKey: ['causas', 'activas', categoria ?? 'todas'],
    queryFn: async () =>
      await desenvolver(api.GET('/api/causas', { params: { query: { categoria } } })),
  });
}

export function useCausasAtendidas(categoria?: CategoriaCausa) {
  return useQuery<CausaPublica[], ErrorApi>({
    queryKey: ['causas', 'atendidas', categoria ?? 'todas'],
    queryFn: async () =>
      await desenvolver(api.GET('/api/causas/atendidas', { params: { query: { categoria } } })),
  });
}

export function useCausa(id: string) {
  return useQuery<CausaPublica, ErrorApi>({
    queryKey: ['causas', 'una', id],
    queryFn: async () =>
      await desenvolver(api.GET('/api/causas/{id}', { params: { path: { id } } })),
  });
}

// ── Consola ──

export function useCausasGestion(estado: EstadoGestion) {
  return useQuery<CausaGestion[], ErrorApi>({
    queryKey: ['causas', 'gestion', estado],
    queryFn: async () =>
      await desenvolver(api.GET('/api/causas/gestion', { params: { query: { estado } } })),
  });
}

/** Una causa de la consola: se busca en activas (que incluye las por cerrar) y en atendidas. */
export function useCausaGestion(id: string) {
  const activas = useCausasGestion('activas');
  const atendidas = useCausasGestion('atendidas');
  const causa = [...(activas.data ?? []), ...(atendidas.data ?? [])].find((c) => c.id === id);
  return {
    causa,
    // Se muestra apenas aparece en una de las dos, sin esperar la otra
    isPending: !causa && (activas.isPending || atendidas.isPending),
    error: causa ? null : (activas.error ?? atendidas.error),
    refetch: () => Promise.all([activas.refetch(), atendidas.refetch()]),
  };
}

function useCambio<T, R>(
  hacer: (datos: T) => Promise<R>,
  claves: string[][] = [['causas']],
  antes?: (consultas: QueryClient, respuesta: R) => void,
) {
  const consultas = useQueryClient();
  return useMutation<R, ErrorApi, T>({
    mutationFn: hacer,
    onSuccess: (respuesta) => {
      antes?.(consultas, respuesta);
      for (const c of claves) void consultas.invalidateQueries({ queryKey: c });
    },
  });
}

/** La causa editada entra a las listas de la consola sin esperar la recarga (C22 la lee de ahí). */
function ponerEnListas(consultas: QueryClient, causa: CausaGestion) {
  consultas.setQueriesData<CausaGestion[]>({ queryKey: ['causas', 'gestion'] }, (lista) =>
    lista?.map((c) => (c.id === causa.id ? causa : c)),
  );
}

const conEntidades = [['causas'], ['entidades']];

export const useCrearCausa = () =>
  useCambio(
    async (datos: DatosCausa) =>
      await desenvolver(api.POST('/api/causas', { body: { ...datos, confirmo: true } })),
    conEntidades,
  );

/** `confirmo` va solo si cambian el enlace o la entidad (C-09). */
export const useEditarCausa = (id: string) =>
  useCambio(
    async (cambios: Partial<DatosCausa> & { confirmo?: boolean }) =>
      await desenvolver(api.PATCH('/api/causas/{id}', { params: { path: { id } }, body: cambios })),
    undefined,
    ponerEnListas,
  );

const usePlazo = (id: string, que: 'renovar' | 'reactivar') =>
  useCambio(
    async (cierraEl: string) =>
      await desenvolver(
        api.POST(`/api/causas/{id}/${que}`, {
          params: { path: { id } },
          body: { cierraEl, confirmo: true },
        }),
      ),
    conEntidades,
  );

export const useRenovarCausa = (id: string) => usePlazo(id, 'renovar');
export const useReactivarCausa = (id: string) => usePlazo(id, 'reactivar');

export const useArchivarCausa = (id: string) =>
  useCambio(
    async () =>
      await desenvolver(api.POST('/api/causas/{id}/archivar', { params: { path: { id } } })),
    conEntidades,
  );

const subir = (campo: string, archivo: File) => ({
  body: { [campo]: archivo as unknown as string } as never,
  bodySerializer: () => {
    const forma = new FormData();
    forma.append(campo, archivo);
    return forma;
  },
});

export const useSubirImagenCausa = (id: string) =>
  useCambio(
    async (archivo: File) =>
      await desenvolver(
        api.PUT('/api/causas/{id}/imagen', {
          params: { path: { id } },
          ...subir('imagen', archivo),
        }),
      ),
  );

// ── Verificación de entidades (C15) ──

export const useVerificarEntidad = (id: string) =>
  useCambio(
    async () =>
      await desenvolver(
        api.POST('/api/entidades/{id}/verificar', {
          params: { path: { id } },
          body: { confirmo: true },
        }),
      ),
    conEntidades,
  );

export const useQuitarVerificacion = (id: string) =>
  useCambio(
    async () =>
      await desenvolver(
        api.POST('/api/entidades/{id}/quitar-verificacion', { params: { path: { id } } }),
      ),
    conEntidades,
  );

export const useSubirLogo = (id: string) =>
  useCambio<File, Entidad>(
    async (archivo: File) =>
      await desenvolver(
        api.PUT('/api/entidades/{id}/logo', {
          params: { path: { id } },
          ...subir('logo', archivo),
        }),
      ),
    conEntidades,
  );

/** Sube la imagen de una causa recién creada, cuando el id todavía no estaba en un hook. */
export async function subirImagenCausa(id: string, archivo: File) {
  return await desenvolver(
    api.PUT('/api/causas/{id}/imagen', { params: { path: { id } }, ...subir('imagen', archivo) }),
  );
}
