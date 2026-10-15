import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import { useEmergenciasVigentes } from './emergencias';
import type { components } from './esquema';
import type { Zona } from './red';

type S = components['schemas'];
export type Remision = S['RemisionDto'];
export type EstadoRemision = Remision['estado'];
export type LineaRemision = Remision['lineas'][number];
export type Excedente = S['ExcedenteDto'];
export type FolioVinculable = S['FolioVinculableDto'];
export type DatosRemision = S['CrearRemisionDto'];
export type LineaNueva = DatosRemision['lineas'][number];
export interface FiltroRemisiones {
  estado?: EstadoRemision;
  zona?: string;
}

export const NOMBRE_ESTADO: Record<EstadoRemision, string> = {
  BORRADOR: 'Borrador',
  EN_TRANSITO: 'En tránsito',
  RECIBIDA: 'Recibida',
  CANCELADA: 'Cancelada',
};

/** Lo que una línea puede llevar: el movible más lo que ya tiene en esta remisión (I2-08). */
export const topeLinea = (excedente: Excedente | undefined, propia: number) =>
  Math.round(((excedente?.movible ?? 0) + propia) * 1000) / 1000;

/** La URL que guarda el QR del documento; el escáner de C13 saca el token de ella (I2-04). */
export const urlRecepcion = (qrToken: string) =>
  `${window.location.origin}/consola/recepciones/qr/${qrToken}`;

/** La foto `n` (desde 0) de la entrega; la API la sirve con la cookie de sesión (I2-09). */
export const urlEvidencia = (codigo: string, n: number) =>
  `${import.meta.env.VITE_API_URL || window.location.origin}/api/remisiones/${encodeURIComponent(codigo)}/evidencia/${n}`;

/** La fecha que importa en cada estado: creada, despachada, recibida o cancelada. */
export function fechaDelEstado(r: Remision): string {
  switch (r.estado) {
    case 'EN_TRANSITO':
      return r.despachadaEn ?? r.creadaEn;
    case 'RECIBIDA':
      return r.recibidaEn ?? r.creadaEn;
    case 'CANCELADA':
      return r.canceladaEn ?? r.creadaEn;
    default:
      return r.creadaEn;
  }
}

const ruta = (codigo: string) => ({ params: { path: { codigo } } });

function useInvalidar() {
  const consultas = useQueryClient();
  return (...claves: unknown[][]) => {
    for (const queryKey of claves) void consultas.invalidateQueries({ queryKey });
  };
}

/** C12: las remisiones de los acopios de la persona (todas, para el Administrador). */
export function useRemisiones(filtro: FiltroRemisiones) {
  return useQuery<Remision[], ErrorApi>({
    queryKey: ['remisiones', filtro],
    queryFn: () => desenvolver(api.GET('/api/remisiones', { params: { query: filtro } })),
  });
}

export function useRemision(codigo: string) {
  return useQuery<Remision, ErrorApi>({
    queryKey: ['remision', codigo],
    queryFn: () => desenvolver(api.GET('/api/remisiones/{codigo}', ruta(codigo))),
  });
}

/** Superávit y movible por categoría del acopio, para el editor de líneas. */
export function useExcedentes(acopioId: string | null) {
  return useQuery<Excedente[], ErrorApi>({
    queryKey: ['excedentes', acopioId],
    enabled: acopioId !== null,
    queryFn: () =>
      desenvolver(api.GET('/api/acopios/{id}/excedentes', { params: { path: { id: acopioId! } } })),
  });
}

export function useFoliosVinculables(codigo: string, activo: boolean) {
  return useQuery<FolioVinculable[], ErrorApi>({
    queryKey: ['folios-vinculables', codigo],
    enabled: activo,
    queryFn: () =>
      desenvolver(api.GET('/api/remisiones/{codigo}/folios-vinculables', ruta(codigo))),
  });
}

/** Las zonas de emergencias activas o en seguimiento: las únicas que reciben remisiones. */
export function useZonasVigentes() {
  const emergencias = useEmergenciasVigentes();
  const zonas = useQuery<Zona[], ErrorApi>({
    queryKey: ['zonas', 'vigentes'],
    queryFn: () => desenvolver(api.GET('/api/zonas')),
  });
  const vigentes = new Set(emergencias.data?.map((e) => e.id));
  return {
    data:
      zonas.data && emergencias.data
        ? zonas.data.filter((z) => vigentes.has(z.emergenciaId))
        : undefined,
    isPending: zonas.isPending || emergencias.isPending,
    error: zonas.error ?? emergencias.error,
  };
}

export function useCrearRemision() {
  const invalidar = useInvalidar();
  return useMutation<Remision, ErrorApi, DatosRemision>({
    mutationFn: (datos) => desenvolver(api.POST('/api/remisiones', { body: datos })),
    onSuccess: () => invalidar(['remisiones'], ['excedentes']),
    onError: (e) => {
      // El tope que muestra el editor quedó viejo: se vuelve a pedir
      if (e.codigo === 'LINEA_EXCEDE_MOVIBLE') invalidar(['excedentes']);
    },
  });
}

export function useGuardarLineas(codigo: string) {
  const invalidar = useInvalidar();
  return useMutation<Remision, ErrorApi, LineaNueva[]>({
    mutationFn: (lineas) =>
      desenvolver(
        api.PUT('/api/remisiones/{codigo}/lineas', { ...ruta(codigo), body: { lineas } }),
      ),
    onSuccess: () => invalidar(['remision', codigo], ['remisiones'], ['excedentes']),
    onError: (e) => {
      // El tope que muestra el editor quedó viejo: se vuelve a pedir
      if (e.codigo === 'LINEA_EXCEDE_MOVIBLE') invalidar(['excedentes']);
    },
  });
}

export function useEditarRemision(codigo: string) {
  const invalidar = useInvalidar();
  return useMutation<Remision, ErrorApi, { responsable?: string | null; zonaId?: string | null }>({
    mutationFn: (cambios) =>
      desenvolver(api.PATCH('/api/remisiones/{codigo}', { ...ruta(codigo), body: cambios })),
    onSuccess: () => invalidar(['remision', codigo], ['remisiones']),
  });
}

export function useDespachar(codigo: string) {
  const invalidar = useInvalidar();
  return useMutation<Remision, ErrorApi, string[]>({
    mutationFn: (folios) =>
      desenvolver(
        api.POST('/api/remisiones/{codigo}/despachar', { ...ruta(codigo), body: { folios } }),
      ),
    onSuccess: () => invalidar(['remision', codigo], ['remisiones'], ['excedentes']),
  });
}

export function useCancelar(codigo: string) {
  const invalidar = useInvalidar();
  return useMutation<Remision, ErrorApi, string>({
    mutationFn: (motivo) =>
      desenvolver(
        api.POST('/api/remisiones/{codigo}/cancelar', { ...ruta(codigo), body: { motivo } }),
      ),
    onSuccess: () => invalidar(['remision', codigo], ['remisiones'], ['excedentes']),
  });
}
