import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, ErrorApi } from './cliente';
import type { components } from './esquema';

type S = components['schemas'];
export type Donacion = S['ComprobanteDto'];
export type EstadoComprobante = Donacion['estado'];
export type DatosDonacion = S['CrearDonacionDto'];
export type LineaSugerencia = S['SugerenciasDto']['lineas'][number];
export type SugerenciaEntrega = S['SugerenciaEntregaDto'];
export type CodigoDonador = S['CodigoDonadorDto'];
export type DatosProponer = S['ProponerCodigoDto'];
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
    placeholderData: keepPreviousData,
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

/** El Donador propone un código desconocido: queda sin confirmar hasta que un Operador lo
 *  valide. Si otro Donador ya lo propuso, devuelve ese. */
export function useProponerCodigo() {
  const consultas = useQueryClient();
  return useMutation<CodigoDonador, ErrorApi, DatosProponer>({
    mutationFn: (datos) => desenvolver(api.POST('/api/donaciones/codigos', { body: datos })),
    onSuccess: () => void consultas.invalidateQueries({ queryKey: ['presentaciones'] }),
  });
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

/** La foto de la factura; la API la sirve con la cookie de sesión (ADR-0017). */
export const urlFactura = (folio: string) =>
  `${import.meta.env.VITE_API_URL || window.location.origin}/api/comprobantes/${encodeURIComponent(folio)}/factura`;

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
