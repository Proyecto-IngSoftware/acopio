import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';
import type { Remision } from './remisiones';

export type ReporteNecesidad = components['schemas']['ReporteNecesidadDto'];
export interface DatosRecibirRemision {
  zonaId?: string;
  nota?: string;
}
export interface DatosReporte {
  categorias: string[];
  nota?: string;
  resuelta: boolean;
}

const PREFIJO_QR = '/consola/recepciones/qr/';

/** El token del QR de una remisión: de la URL que imprime C12 o suelto (I3-08). */
export function tokenDeQr(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  const i = t.indexOf(PREFIJO_QR);
  if (i >= 0) return t.slice(i + PREFIJO_QR.length).split(/[?#/]/)[0] || null;
  return t.includes('/') ? null : t;
}

/** Lo último reportado de cada categoría, solo lo que sigue faltando (I3-07). */
export function pendientesDeResolver(reportes: ReporteNecesidad[]): ReporteNecesidad[] {
  const ultimo = new Map<string, ReporteNecesidad>();
  for (const r of reportes) {
    const previo = ultimo.get(r.categoriaId);
    if (!previo || r.reportadoEn > previo.reportadoEn) ultimo.set(r.categoriaId, r);
  }
  return [...ultimo.values()].filter((r) => !r.resuelta);
}

function useInvalidar() {
  const consultas = useQueryClient();
  return (...claves: unknown[][]) => {
    for (const queryKey of claves) void consultas.invalidateQueries({ queryKey });
  };
}

/** C13: las remisiones en camino a las zonas del Receptor y los despachos generales.
 *  Con `activo` en falso no consulta: solo el Receptor puede leerlas. */
export function useRecepciones(activo = true) {
  return useQuery<Remision[], ErrorApi>({
    queryKey: ['recepciones'],
    enabled: activo,
    queryFn: () => desenvolver(api.GET('/api/recepciones')),
  });
}

export function useRemisionPorQr(token: string) {
  return useQuery<Remision, ErrorApi>({
    queryKey: ['recepcion-qr', token],
    queryFn: () =>
      desenvolver(api.GET('/api/recepciones/qr/{token}', { params: { path: { token } } })),
    retry: false,
  });
}

/** Sube una foto de lo que llegó (multipart, campo `foto`). */
export function useSubirEvidencia(codigo: string) {
  const invalidar = useInvalidar();
  return useMutation<Remision, ErrorApi, File>({
    mutationFn: (archivo) =>
      desenvolver(
        api.POST('/api/remisiones/{codigo}/evidencia', {
          params: { path: { codigo } },
          body: { foto: archivo as unknown as string },
          bodySerializer: () => {
            const forma = new FormData();
            forma.append('foto', archivo);
            return forma;
          },
        }),
      ),
    onSuccess: () => invalidar(['recepciones']),
    onError: (e) => e.estado === 409 && invalidar(['recepciones']),
  });
}

export function useRecibirRemision(codigo: string) {
  const invalidar = useInvalidar();
  return useMutation<Remision, ErrorApi, DatosRecibirRemision>({
    mutationFn: (d) =>
      desenvolver(
        api.POST('/api/remisiones/{codigo}/recibir', { params: { path: { codigo } }, body: d }),
      ),
    onSuccess: () =>
      invalidar(
        ['recepciones'],
        ['recepcion-qr'],
        ['ficha-zona'],
        ['remisiones'],
        ['remision', codigo],
      ),
    // La remisión cambió mientras se recibía: la lista deja de traerla
    onError: (e) => e.estado === 409 && invalidar(['recepciones']),
  });
}

export function useReportesZona(zonaId: string) {
  return useQuery<ReporteNecesidad[], ErrorApi>({
    queryKey: ['reportes-zona', zonaId],
    queryFn: () =>
      desenvolver(api.GET('/api/zonas/{id}/reportes', { params: { path: { id: zonaId } } })),
  });
}

/** C20: reporta lo que falta en la zona o marca que ya se resolvió. */
export function useReportar(zonaId: string) {
  const invalidar = useInvalidar();
  return useMutation<{ creados: string[] }, ErrorApi, DatosReporte>({
    mutationFn: (d) =>
      desenvolver(
        api.POST('/api/zonas/{id}/reportes', { params: { path: { id: zonaId } }, body: d }),
      ),
    onSuccess: () =>
      invalidar(['reportes-zona', zonaId], ['ficha-zona', zonaId], ['zonas', 'publicas']),
  });
}
