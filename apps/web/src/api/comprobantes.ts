import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, ErrorApi } from './cliente';
import type { components } from './esquema';

type S = components['schemas'];
export type Comprobante = S['ComprobanteDto'];
export type LineaComprobante = Comprobante['lineas'][number];
export type Conciliacion = S['ConciliacionDto'];
export type Bandeja = S['BandejaRespuestaDto'];
export type EntradaVinculable = S['EntradaVinculableDto'];
export type Recepcion = S['RecepcionDto'];
export type DatosRecepcion = S['RecibirDto'];
export type MotivoRechazo = S['RechazarDto']['motivo'];
export type EstadoBandeja = 'PENDIENTE' | 'CONCILIADO' | 'RECHAZADO';

export const MOTIVOS_RECHAZO: Record<MotivoRechazo, string> = {
  DUPLICADO: 'Duplicado',
  NO_CUADRA_MOVIMIENTOS: 'No cuadra con los movimientos',
  DIFERENCIA_SIN_EXPLICAR: 'Diferencia sin explicar',
  OTRO: 'Otro',
};

// P-031: el esquema genera estos campos como arreglos, pero la API manda texto o null
type ConRechazo = { motivoRechazo: unknown; notaRechazo: unknown };
export const motivoDe = (c: ConRechazo) => (c.motivoRechazo as MotivoRechazo | null) ?? null;
export const notaDe = (c: ConRechazo) => (c.notaRechazo as string | null) ?? null;

/** Lo que suman las presentaciones en unidad base: 12 × 0,5 L = 6 L. */
export const enBase = (cantidad: number, contenidoUnitario: number) =>
  Math.round(cantidad * contenidoUnitario * 1000) / 1000;

const ruta = (folio: string) => ({ params: { path: { folio } } });

/** Lo declarado y el estado de un folio. Un folio que no existe da null, sin reintentos. */
export function useComprobante(folio: string | null) {
  return useQuery<Comprobante | null, ErrorApi>({
    queryKey: ['comprobante', folio],
    queryFn: async () => {
      try {
        return await desenvolver(api.GET('/api/comprobantes/{folio}', ruta(folio!)));
      } catch (e) {
        if (e instanceof ErrorApi && e.estado === 404) return null;
        throw e;
      }
    },
    enabled: folio !== null,
    retry: false,
  });
}

/** El Operador confirma lo que llegó; las entradas cambian los saldos del acopio. */
export function useRecibir(folio: string) {
  const consultas = useQueryClient();
  return useMutation<Recepcion, ErrorApi, DatosRecepcion>({
    mutationFn: (datos) =>
      desenvolver(api.POST('/api/comprobantes/{folio}/recepcion', { ...ruta(folio), body: datos })),
    onSuccess: (_r, datos) => {
      void consultas.invalidateQueries({ queryKey: ['comprobante', folio] });
      void consultas.invalidateQueries({ queryKey: ['bandeja'] });
      void consultas.invalidateQueries({ queryKey: ['saldos', datos.acopioId] });
    },
  });
}

/** C8: lo más viejo primero, con el contador por acopio. */
export function useBandeja(filtro: { estado: EstadoBandeja; acopioId?: string }) {
  return useQuery<Bandeja, ErrorApi>({
    queryKey: ['bandeja', filtro.estado, filtro.acopioId],
    queryFn: () => desenvolver(api.GET('/api/comprobantes', { params: { query: filtro } })),
  });
}

export function useConciliacion(folio: string) {
  return useQuery<Conciliacion, ErrorApi>({
    queryKey: ['conciliacion', folio],
    queryFn: () => desenvolver(api.GET('/api/comprobantes/{folio}/conciliacion', ruta(folio))),
    retry: false,
  });
}

/** ENTRADA sin donación de los últimos 14 días del acopio indicado (el del comprobante u otro). */
export function useEntradasVinculables(folio: string, acopioId: string, activo: boolean) {
  return useQuery<EntradaVinculable[], ErrorApi>({
    queryKey: ['vinculables', folio, acopioId],
    queryFn: () =>
      desenvolver(
        api.GET('/api/comprobantes/{folio}/entradas-vinculables', {
          params: { path: { folio }, query: { acopioId } },
        }),
      ),
    enabled: activo,
  });
}

function useAccion<T>(folio: string, llamar: (datos: T) => Promise<Comprobante>) {
  const consultas = useQueryClient();
  return useMutation<Comprobante, ErrorApi, T>({
    mutationFn: llamar,
    onSuccess: () => {
      void consultas.invalidateQueries({ queryKey: ['conciliacion', folio] });
      void consultas.invalidateQueries({ queryKey: ['bandeja'] });
    },
  });
}

export const useVincular = (folio: string) =>
  useAccion<S['VincularDto']>(folio, (body) =>
    desenvolver(api.POST('/api/comprobantes/{folio}/vinculos', { ...ruta(folio), body })),
  );

export const useConciliar = (folio: string) =>
  useAccion<void>(folio, () =>
    desenvolver(api.POST('/api/comprobantes/{folio}/conciliar', ruta(folio))),
  );

export const useRechazar = (folio: string) =>
  useAccion<S['RechazarDto']>(folio, (body) =>
    desenvolver(api.POST('/api/comprobantes/{folio}/rechazar', { ...ruta(folio), body })),
  );

export const useRevertirRechazo = (folio: string) =>
  useAccion<void>(folio, () =>
    desenvolver(api.POST('/api/comprobantes/{folio}/revertir-rechazo', ruta(folio))),
  );
