import type { Horario } from '@acopio/shared';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

type S = components['schemas'];

export type AcopioPublico = Omit<S['AcopioPublicoDto'], 'horario'> & { horario: Horario };
export type Acopio = AcopioPublico & { creadoEn: string };
export type EstadoAcopio = AcopioPublico['estado'];
export type Entidad = S['EntidadDto'];
export type Zona = S['ZonaDto'];
export type EstadoZona = Zona['estado'];
export type Ubicacion = S['UbicacionDto'];
export type ResultadoGeo = S['ResultadoGeoDto'];
export type NoRecibe = S['NoRecibirDto'];
export type ZonaPublica = S['ZonaPublicaDto'];
export type Punto = { lat: number; lng: number };

function useCambio<T, R>(hacer: (datos: T) => Promise<R>, claves: string[][]) {
  const consultas = useQueryClient();
  return useMutation<R, ErrorApi, T>({
    mutationFn: hacer,
    onSuccess: () => {
      for (const c of claves) void consultas.invalidateQueries({ queryKey: c });
    },
  });
}

// ── Zonas con necesidad (capa pública de P5, HU-13.1) ──

// Fuera del hook: con una función nueva en cada render, React Query devolvería otro arreglo
// cada vez y el mapa redibujaría la capa sin parar
const conNecesidad = (zonas: ZonaPublica[]) => zonas.filter((z) => z.necesidades.length > 0);

/** Las zonas con algo reportado como faltante; las demás no se dibujan. */
export function useZonasConNecesidad() {
  return useQuery<ZonaPublica[], ErrorApi>({
    queryKey: ['zonas', 'publicas'],
    queryFn: async () => await desenvolver(api.GET('/api/publico/zonas-necesidad')),
    select: conNecesidad,
  });
}

// ── Acopios ──

type FiltroPublico = { abiertoAhora?: boolean; cerca?: Punto | null };

/** Consulta de P5; la usa también `App` para lanzarla antes de que llegue la pantalla. */
export function opcionesAcopiosPublicos(filtro: FiltroPublico) {
  const cerca = filtro.cerca ? `${filtro.cerca.lat},${filtro.cerca.lng}` : undefined;
  return queryOptions<AcopioPublico[], ErrorApi>({
    queryKey: ['acopios', 'publicos', filtro.abiertoAhora ?? false, cerca],
    queryFn: async () => {
      const filas = await desenvolver(
        api.GET('/api/acopios', {
          params: {
            query: { abiertoAhora: filtro.abiertoAhora ? 'true' : undefined, cerca } as never,
          },
        }),
      );
      return filas;
    },
  });
}

export function useAcopiosPublicos(filtro: FiltroPublico) {
  return useQuery(opcionesAcopiosPublicos(filtro));
}

export function useAcopio(id: string, activo = true) {
  return useQuery<AcopioPublico, ErrorApi>({
    queryKey: ['acopios', id],
    enabled: activo,
    queryFn: async () =>
      await desenvolver(api.GET('/api/acopios/{id}', { params: { path: { id } } })),
  });
}

/** Con `activo` en falso no consulta: solo el Administrador ve todos los acopios. */
export function useAcopiosGestion(activo = true) {
  return useQuery<Acopio[], ErrorApi>({
    queryKey: ['acopios', 'gestion'],
    enabled: activo,
    queryFn: async () => await desenvolver(api.GET('/api/acopios/gestion')),
  });
}

export interface DatosAcopio {
  entidadId: string;
  nombre: string;
  direccion: string;
  municipio: string;
  lat: number;
  lng: number;
  telefono: string | null;
  indicacionesAcceso: string | null;
  horario: Horario;
  estado?: EstadoAcopio;
}

export const useGuardarAcopio = () =>
  useCambio(
    async ({ id, datos }: { id?: string; datos: Partial<DatosAcopio> }) =>
      await desenvolver(
        id
          ? api.PATCH('/api/acopios/{id}', { params: { path: { id } }, body: datos as never })
          : api.POST('/api/acopios', { body: datos as never }),
      ),
    [['acopios'], ['ubicaciones']],
  );

export type DatosOperacion = Pick<DatosAcopio, 'horario' | 'telefono' | 'indicacionesAcceso'> & {
  estado: 'ACTIVO' | 'PAUSADO';
};

export const useOperarAcopio = (id: string) =>
  useCambio(
    async (datos: Partial<DatosOperacion>) =>
      await desenvolver(
        api.PATCH('/api/acopios/{id}/operacion', {
          params: { path: { id } },
          body: datos as never,
        }),
      ),
    [['acopios']],
  );

// ── Entidades ──

export function useEntidades() {
  return useQuery<Entidad[], ErrorApi>({
    queryKey: ['entidades'],
    queryFn: async () => await desenvolver(api.GET('/api/entidades')),
  });
}

export type DatosEntidad = Omit<
  Entidad,
  'id' | 'verificacion' | 'verificadaEn' | 'tieneLogo' | 'causasActivas'
>;

export const useGuardarEntidad = () =>
  useCambio(
    async ({ id, datos }: { id?: string; datos: Partial<DatosEntidad> }) =>
      desenvolver(
        id
          ? api.PATCH('/api/entidades/{id}', { params: { path: { id } }, body: datos as never })
          : api.POST('/api/entidades', { body: datos as never }),
      ),
    [['entidades'], ['acopios']],
  );

// ── Zonas ──

export function useZonas(emergenciaId: string | null) {
  return useQuery<Zona[], ErrorApi>({
    queryKey: ['zonas', emergenciaId],
    enabled: emergenciaId !== null,
    queryFn: async () =>
      await desenvolver(
        api.GET('/api/zonas', { params: { query: { emergencia: emergenciaId! } as never } }),
      ),
  });
}

export interface DatosZona {
  emergenciaId: string;
  nombre: string;
  municipio: string;
  lat: number;
  lng: number;
  poblacionEstimada: number;
  poblacionFuente: string;
  poblacionFecha: string;
  estado?: EstadoZona;
}

export const useGuardarZona = () =>
  useCambio(
    async ({ id, datos }: { id?: string; datos: Partial<DatosZona> }) => {
      if (id) {
        const { emergenciaId: _, ...cambios } = datos;
        return await desenvolver(
          api.PATCH('/api/zonas/{id}', { params: { path: { id } }, body: cambios as never }),
        );
      }
      return await desenvolver(api.POST('/api/zonas', { body: datos as never }));
    },
    [['zonas'], ['ubicaciones']],
  );

// ── Ubicaciones ──

/** Con `activo` en falso no consulta: el Administrador y el Donador no tienen asignaciones. */
export function useUbicacionesMias(activo = true) {
  return useQuery<Ubicacion[], ErrorApi>({
    queryKey: ['ubicaciones', 'mias'],
    enabled: activo,
    queryFn: async () => await desenvolver(api.GET('/api/ubicaciones/mias')),
  });
}

export function useBuscarUbicaciones(q: string) {
  const texto = q.trim();
  return useQuery<Ubicacion[], ErrorApi>({
    queryKey: ['ubicaciones', 'buscar', texto],
    queryFn: async () =>
      await desenvolver(
        api.GET('/api/ubicaciones', { params: { query: { q: texto || undefined } as never } }),
      ),
  });
}

// ── Geocodificación ──

export const useGeocodificar = () =>
  useMutation<ResultadoGeo[], ErrorApi, string>({
    mutationFn: async (q) =>
      await desenvolver(api.GET('/api/geocodificar', { params: { query: { q } as never } })),
  });

// ── No recibir (módulo inventario) ──

export function useNoRecibir(acopioId: string) {
  return useQuery<NoRecibe[], ErrorApi>({
    queryKey: ['no-recibir', acopioId],
    queryFn: async () =>
      desenvolver(api.GET('/api/acopios/{id}/no-recibir', { params: { path: { id: acopioId } } })),
  });
}

/** Acopios que no reciben esa categoría, para el filtro del mapa. */
export function useAcopiosQueNoReciben(categoriaId: string | null) {
  return useQuery<Set<string>, ErrorApi>({
    queryKey: ['no-recibir', 'categoria', categoriaId],
    enabled: categoriaId !== null,
    queryFn: async () => {
      const filas = await desenvolver(
        api.GET('/api/no-recibir', { params: { query: { categoria: categoriaId! } as never } }),
      );
      return new Set(filas.map((f) => f.acopioId));
    },
  });
}

const rutaNoRecibir = (id: string, categoriaId: string) => ({
  params: { path: { id, categoriaId } },
});

export const useMarcarNoRecibir = (acopioId: string) =>
  useCambio(
    async ({ categoriaId, hasta }: { categoriaId: string; hasta: string | null }) =>
      desenvolver(
        api.PUT('/api/acopios/{id}/no-recibir/{categoriaId}', {
          ...rutaNoRecibir(acopioId, categoriaId),
          body: { hasta } as never,
        }),
      ),
    [['no-recibir']],
  );

export const useDesmarcarNoRecibir = (acopioId: string) =>
  useCambio(
    async (categoriaId: string) =>
      desenvolver(
        api.DELETE(
          '/api/acopios/{id}/no-recibir/{categoriaId}',
          rutaNoRecibir(acopioId, categoriaId),
        ),
      ),
    [['no-recibir']],
  );
