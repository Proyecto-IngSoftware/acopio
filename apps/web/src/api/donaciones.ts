import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, ErrorApi } from './cliente';
import type { components } from './esquema';

type S = components['schemas'];
export type Donacion = S['ComprobanteDto'];
export type EstadoComprobante = Donacion['estado'];
export type DatosDonacion = S['CrearDonacionDto'];
export type LineaSugerencia = S['SugerenciasDto']['lineas'][number];
export type SugerenciaEntrega = S['SugerenciaEntregaDto'];
export type CodigoDonador = S['CodigoDonadorDto'];
export type UrlFactura = S['UrlFacturaDto'];
export type Seguimiento = S['SeguimientoDto'];

export const ESTADOS_DONACION: Record<EstadoComprobante, string> = {
  PREPARADO: 'Preparada',
  PENDIENTE: 'Recibida en el acopio',
  CONCILIADO: 'Conciliada',
  RECHAZADO: 'No se pudo conciliar',
  CANCELADO: 'Cancelada',
};

/** Las donaciones del Donador con sesión, de la más reciente a la más antigua. */
export function useMisDonaciones(estado?: EstadoComprobante) {
  return useQuery<Donacion[], ErrorApi>({
    queryKey: ['misDonaciones', estado],
    queryFn: () => desenvolver(api.GET('/api/donaciones', { params: { query: { estado } } })),
  });
}

export function usePrepararDonacion() {
  const consultas = useQueryClient();
  return useMutation<Donacion, ErrorApi, DatosDonacion>({
    mutationFn: (datos) => desenvolver(api.POST('/api/donaciones', { body: datos })),
    onSuccess: () => consultas.invalidateQueries({ queryKey: ['misDonaciones'] }),
  });
}

export function useCancelarDonacion() {
  const consultas = useQueryClient();
  return useMutation<Donacion, ErrorApi, string>({
    mutationFn: (folio) =>
      desenvolver(api.POST('/api/donaciones/{folio}/cancelar', { params: { path: { folio } } })),
    onSuccess: () => consultas.invalidateQueries({ queryKey: ['misDonaciones'] }),
  });
}

/** Acopios donde entregar lo que lleva la donación (RF-DON). Sin líneas no consulta. */
export function useSugerencias(
  lineas: LineaSugerencia[],
  ubicacion?: { lat: number; lng: number },
) {
  return useQuery<SugerenciaEntrega[], ErrorApi>({
    queryKey: ['sugerencias', lineas, ubicacion?.lat, ubicacion?.lng],
    queryFn: () =>
      desenvolver(
        api.POST('/api/donaciones/sugerencias', {
          body: { lineas, lat: ubicacion?.lat, lng: ubicacion?.lng },
        }),
      ),
    enabled: lineas.length > 0,
  });
}

/** La categoría de un código de barras, o null si no se conoce (404). */
export async function consultarCodigoDonador(ean: string): Promise<CodigoDonador | null> {
  try {
    return await desenvolver(
      api.GET('/api/donaciones/codigos/{ean}', { params: { path: { ean } } }),
    );
  } catch (e) {
    if (e instanceof ErrorApi && e.estado === 404) return null;
    throw e;
  }
}

/** Sube la foto de la factura de una donación (multipart, campo `factura`). */
export function subirFactura(folio: string, archivo: File): Promise<Donacion> {
  return desenvolver(
    api.POST('/api/donaciones/{folio}/factura', {
      params: { path: { folio } },
      body: { factura: archivo as unknown as string },
      bodySerializer: () => {
        const forma = new FormData();
        forma.append('factura', archivo);
        return forma;
      },
    }),
  );
}

/** URL firmada de la foto de la factura; solo se pide cuando `activo`. */
export function useUrlFactura(folio: string, activo: boolean) {
  return useQuery<UrlFactura, ErrorApi>({
    queryKey: ['urlFactura', folio],
    queryFn: () =>
      desenvolver(api.GET('/api/comprobantes/{folio}/factura', { params: { path: { folio } } })),
    enabled: activo,
  });
}

/** Seguimiento público por folio. Un folio que no existe da null, sin reintentos. */
export function useSeguimiento(folio: string) {
  return useQuery<Seguimiento | null, ErrorApi>({
    queryKey: ['seguimiento', folio],
    queryFn: async () => {
      try {
        return await desenvolver(
          api.GET('/api/seguimiento/{folio}', { params: { path: { folio } } }),
        );
      } catch (e) {
        if (e instanceof ErrorApi && e.estado === 404) return null;
        throw e;
      }
    },
    retry: false,
  });
}
