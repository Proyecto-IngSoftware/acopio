import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

type S = components['schemas'];

export type JornadaPublica = S['JornadaPublicaDto'];
export type JornadaGestion = S['JornadaGestionDto'];
export type ReservaCreada = S['ReservaCreadaDto'];
export type ReservaPublica = S['ReservaPublicaDto'];
export type Inscrito = S['InscritoDto'];
export type DatosJornada = S['CrearJornadaDto'];
export type CambiosJornada = S['EditarJornadaDto'];
export type Perfil = NonNullable<JornadaPublica['perfilRequerido']>;
export type PestanaGestion = 'proximas' | 'en-curso' | 'pasadas';

export interface FiltroJornadas {
  desde?: string;
  hasta?: string;
  acopio?: string;
  entidad?: string;
  perfil?: Perfil;
}

// ── Público ──

export function useJornadas(filtro: FiltroJornadas = {}) {
  return useQuery<JornadaPublica[], ErrorApi>({
    queryKey: ['turnos', 'jornadas', filtro],
    queryFn: async () =>
      await desenvolver(api.GET('/api/turnos/jornadas', { params: { query: filtro } })),
  });
}

export function useJornada(id: string) {
  return useQuery<JornadaPublica, ErrorApi>({
    queryKey: ['turnos', 'jornada', id],
    queryFn: async () =>
      await desenvolver(api.GET('/api/turnos/jornadas/{id}', { params: { path: { id } } })),
  });
}

export function useReservar(jornadaId: string) {
  const consultas = useQueryClient();
  return useMutation<
    ReservaCreada,
    ErrorApi,
    { nombre: string; correo: string; telefono?: string; perfilDeclarado: boolean }
  >({
    mutationFn: async (datos) =>
      await desenvolver(
        api.POST('/api/turnos/jornadas/{id}/reservas', {
          params: { path: { id: jornadaId } },
          body: { ...datos, consentimiento: true },
        }),
      ),
    onSuccess: () => void consultas.invalidateQueries({ queryKey: ['turnos'] }),
  });
}

/** El secreto viaja en el cuerpo del POST, nunca en la URL (T-07). Sin secreto no consulta. */
export function useConsultarReserva(codigo: string, secreto: string | null) {
  return useQuery<ReservaPublica, ErrorApi>({
    queryKey: ['turnos', 'reserva', codigo],
    enabled: secreto !== null,
    queryFn: async () =>
      await desenvolver(
        api.POST('/api/turnos/reservas/{codigo}/consultar', {
          params: { path: { codigo } },
          body: { secreto: secreto! },
        }),
      ),
  });
}

export function useCancelarReserva(codigo: string) {
  const consultas = useQueryClient();
  return useMutation<unknown, ErrorApi, string>({
    mutationFn: async (secreto) =>
      await desenvolver(
        api.POST('/api/turnos/reservas/{codigo}/cancelar', {
          params: { path: { codigo } },
          body: { secreto },
        }),
      ),
    onSuccess: () => void consultas.invalidateQueries({ queryKey: ['turnos'] }),
  });
}

// ── Consola ──

export function useJornadasGestion(pestana: PestanaGestion) {
  return useQuery<JornadaGestion[], ErrorApi>({
    queryKey: ['turnos', 'gestion', pestana],
    queryFn: async () =>
      await desenvolver(
        api.GET('/api/turnos/gestion/jornadas', { params: { query: { pestana } } }),
      ),
  });
}

export function useInscritos(id: string) {
  return useQuery<Inscrito[], ErrorApi>({
    queryKey: ['turnos', 'inscritos', id],
    queryFn: async () =>
      await desenvolver(
        api.GET('/api/turnos/gestion/jornadas/{id}/reservas', { params: { path: { id } } }),
      ),
  });
}

function useCambio<T, R>(hacer: (datos: T) => Promise<R>) {
  const consultas = useQueryClient();
  return useMutation<R, ErrorApi, T>({
    mutationFn: hacer,
    onSuccess: () => void consultas.invalidateQueries({ queryKey: ['turnos'] }),
  });
}

export const useCrearJornadas = () =>
  useCambio(
    async (datos: DatosJornada) =>
      await desenvolver(api.POST('/api/turnos/gestion/jornadas', { body: datos })),
  );

export const useEditarJornada = (id: string) =>
  useCambio(
    async (cambios: CambiosJornada) =>
      await desenvolver(
        api.PATCH('/api/turnos/gestion/jornadas/{id}', {
          params: { path: { id } },
          body: cambios,
        }),
      ),
  );

export type CambioEstado =
  { accion: 'cerrar' } | { accion: 'reabrir' } | { accion: 'cancelar'; motivo: string };

export const useCambiarEstadoJornada = (id: string) =>
  useCambio(async (cambio: CambioEstado) => {
    const params = { path: { id } };
    if (cambio.accion === 'cancelar')
      return await desenvolver(
        api.POST('/api/turnos/gestion/jornadas/{id}/cancelar', {
          params,
          body: { motivo: cambio.motivo },
        }),
      );
    return await desenvolver(
      api.POST(`/api/turnos/gestion/jornadas/{id}/${cambio.accion}`, { params }),
    );
  });

export const useBorrarJornada = (id: string) =>
  useCambio(
    async () =>
      await desenvolver(
        api.DELETE('/api/turnos/gestion/jornadas/{id}', { params: { path: { id } } }),
      ),
  );

export const useAjustarCupos = (id: string) =>
  useCambio(
    async (cupos: number) =>
      await desenvolver(
        api.PUT('/api/turnos/gestion/jornadas/{id}/ajuste', {
          params: { path: { id } },
          body: { cupos },
        }),
      ),
  );

/** La clave de la jornada solo agrupa; la invalidación de `['turnos']` refresca sus inscritos. */
export const useMarcarAsistencia = (_jornadaId: string) =>
  useCambio(
    async ({ reservaId, estado }: { reservaId: string; estado: 'ASISTIO' | 'NO_ASISTIO' }) =>
      await desenvolver(
        api.PUT('/api/turnos/gestion/reservas/{id}/asistencia', {
          params: { path: { id: reservaId } },
          body: { estado },
        }),
      ),
  );
