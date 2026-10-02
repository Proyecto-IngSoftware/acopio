import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

type S = components['schemas'];
export type Saldo = S['SaldoDto'];
export type FilaHistorial = S['PaginaHistorialDto']['filas'][number];
export type ResultadoMovimiento = S['ResultadoMovimientoDto'];
// El contrato tipa `siguiente` como arreglo (P-031); llega como texto o null
type PaginaHistorial = { filas: FilaHistorial[]; siguiente: string | null };

const ruta = (id: string) => ({ params: { path: { id } } });

/** C3: saldos por categoría del acopio (RF-INV-005). */
export function useSaldos(acopioId: string) {
  return useQuery<Saldo[], ErrorApi>({
    queryKey: ['saldos', acopioId],
    queryFn: () => desenvolver(api.GET('/api/acopios/{id}/saldos', ruta(acopioId))),
  });
}

/** Historial de una categoría, 50 por página, del más reciente al más viejo (RF-INV-006). */
export function useHistorial(acopioId: string, categoriaId: string) {
  return useInfiniteQuery({
    queryKey: ['historial', acopioId, categoriaId],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<PaginaHistorial> =>
      (await desenvolver(
        api.GET('/api/acopios/{id}/movimientos', {
          params: { path: { id: acopioId }, query: { categoriaId, cursor: pageParam } as never },
        }),
      )) as unknown as PaginaHistorial,
    getNextPageParam: (ultima) => ultima.siguiente ?? undefined,
  });
}

export interface DatosEntrada {
  id: string;
  categoriaId: string;
  cantidad: number;
  venceEn?: string;
}

/** C4: registra una entrada. El `id` lo genera el navegador (E-04). */
export function useRegistrarEntrada(acopioId: string) {
  const consultas = useQueryClient();
  return useMutation<ResultadoMovimiento, ErrorApi, DatosEntrada>({
    mutationFn: (datos) =>
      desenvolver(
        api.POST('/api/acopios/{id}/entradas', { ...ruta(acopioId), body: datos as never }),
      ),
    onSuccess: () => {
      void consultas.invalidateQueries({ queryKey: ['saldos', acopioId] });
      void consultas.invalidateQueries({ queryKey: ['historial', acopioId] });
    },
  });
}

export type DatosSalida = S['SalidaDto'];

/** C5: registra una salida (RF-INV-003). Con o sin éxito, vuelve a pedir los saldos: un 409 trae uno nuevo. */
export function useRegistrarSalida(acopioId: string) {
  const consultas = useQueryClient();
  return useMutation<ResultadoMovimiento, ErrorApi, DatosSalida>({
    mutationFn: (datos) =>
      desenvolver(api.POST('/api/acopios/{id}/salidas', { ...ruta(acopioId), body: datos })),
    onSettled: () => {
      void consultas.invalidateQueries({ queryKey: ['saldos', acopioId] });
      void consultas.invalidateQueries({ queryKey: ['historial', acopioId] });
    },
  });
}

export type DatosAjuste = S['AjusteDto'];

/** C6: registra un ajuste por conteo físico (RF-INV-004). La API calcula la diferencia. */
export function useRegistrarAjuste(acopioId: string) {
  const consultas = useQueryClient();
  return useMutation<ResultadoMovimiento, ErrorApi, DatosAjuste>({
    mutationFn: (datos) =>
      desenvolver(api.POST('/api/acopios/{id}/ajustes', { ...ruta(acopioId), body: datos })),
    onSettled: () => {
      void consultas.invalidateQueries({ queryKey: ['saldos', acopioId] });
      void consultas.invalidateQueries({ queryKey: ['historial', acopioId] });
    },
  });
}

export type Umbral = S['UmbralDto'];
export type DatosUmbral = S['FijarUmbralDto'] & { categoriaId: string };

/** C7: fija mínimo y máximo de una categoría en el acopio (RF-INV-007). C3 lo lee de los saldos. */
export function useFijarUmbral(acopioId: string) {
  const consultas = useQueryClient();
  return useMutation<Umbral, ErrorApi, DatosUmbral>({
    mutationFn: ({ categoriaId, minimo, maximo }) =>
      desenvolver(
        api.PUT('/api/acopios/{id}/umbrales/{categoriaId}', {
          params: { path: { id: acopioId, categoriaId } },
          body: { minimo, maximo },
        }),
      ),
    onSuccess: () => void consultas.invalidateQueries({ queryKey: ['saldos', acopioId] }),
  });
}

/** C7: quita el umbral; la categoría vuelve a «Sin umbral» (V-03). */
export function useQuitarUmbral(acopioId: string) {
  const consultas = useQueryClient();
  return useMutation<unknown, ErrorApi, string>({
    mutationFn: (categoriaId) =>
      desenvolver(
        api.DELETE('/api/acopios/{id}/umbrales/{categoriaId}', {
          params: { path: { id: acopioId, categoriaId } },
        }),
      ),
    onSuccess: () => void consultas.invalidateQueries({ queryKey: ['saldos', acopioId] }),
  });
}
