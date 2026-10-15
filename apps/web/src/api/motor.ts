import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

type S = components['schemas'];
export type FichaZona = S['FichaZonaDto'];
export type CategoriaFicha = FichaZona['categorias'][number];
export type Sugerencia = S['SugerenciaDto'];
export type EstadoSugerencia = Sugerencia['estado'];
export type Desglose = Sugerencia['desglose'];
export type Configuracion = S['ConfiguracionMotorDto'];
export type Pesos = Configuracion['pesos'];
export type DatosConfiguracion = S['GuardarConfiguracionDto'];
export type VistaPrevia = S['VistaPreviaMotorDto'];
export type InformeDescartes = S['InformeDescartesDto'];
export type Aprobacion = S['AprobacionDto'];
export type Recalculo = S['RecalculoDto'];
export interface FiltroSugerencias {
  estado?: EstadoSugerencia;
  zona?: string;
  acopio?: string;
  categoria?: string;
}

/** Suma de los cuatro pesos, a milésimas. */
export const sumaPesos = (p: Pesos) =>
  Math.round((p.criticidad + p.urgencia + p.proximidad + p.magnitud) * 1000) / 1000;

/** Los pesos suman 1 con la tolerancia de la API (0,001). */
export const pesosValidos = (p: Pesos) => Math.abs(sumaPesos(p) - 1) <= 0.001;

/** La ronda más reciente de las sugerencias listadas (no hay endpoint de la última ronda). */
export const ultimaRonda = (sugerencias: Sugerencia[]): string | null =>
  sugerencias.reduce<string | null>(
    (max, s) => (max === null || Date.parse(s.ronda) > Date.parse(max) ? s.ronda : max),
    null,
  );

function useInvalidar() {
  const consultas = useQueryClient();
  return (...claves: unknown[][]) => {
    for (const queryKey of claves) void consultas.invalidateQueries({ queryKey });
  };
}

/** C10: la necesidad de la zona por categoría, con sus fuentes y los reportes. */
export function useFichaZona(zonaId: string) {
  return useQuery<FichaZona, ErrorApi>({
    queryKey: ['ficha-zona', zonaId],
    queryFn: () =>
      desenvolver(api.GET('/api/zonas/{id}/necesidad', { params: { path: { id: zonaId } } })),
  });
}

/** Corrige la necesidad de una categoría; `cantidad: null` vuelve a la canasta. */
export function useCorregirNecesidad(zonaId: string) {
  const invalidar = useInvalidar();
  return useMutation<
    S['NecesidadManualDto'],
    ErrorApi,
    { categoriaId: string; cantidad: number | null; motivo: string }
  >({
    mutationFn: ({ categoriaId, cantidad, motivo }) =>
      desenvolver(
        api.PUT('/api/zonas/{id}/necesidad-manual/{categoriaId}', {
          params: { path: { id: zonaId, categoriaId } },
          body: { cantidad, motivo },
        }),
      ),
    onSuccess: () => invalidar(['ficha-zona', zonaId], ['sugerencias']),
  });
}

/** Solo la población de la zona, con su fuente y fecha (RF-MOT-012). */
export function useAjustarPoblacion(zonaId: string) {
  const invalidar = useInvalidar();
  return useMutation<
    unknown,
    ErrorApi,
    { poblacionEstimada: number; poblacionFuente: string; poblacionFecha: string }
  >({
    mutationFn: (datos) =>
      desenvolver(
        api.PATCH('/api/zonas/{id}', { params: { path: { id: zonaId } }, body: datos as never }),
      ),
    onSuccess: () => invalidar(['ficha-zona', zonaId], ['zonas']),
  });
}

/** C11: sugerencias ordenadas por puntaje, con los filtros de la pantalla. */
export function useSugerenciasMotor(filtro: FiltroSugerencias) {
  return useQuery<Sugerencia[], ErrorApi>({
    queryKey: ['sugerencias', filtro],
    queryFn: () => desenvolver(api.GET('/api/sugerencias', { params: { query: filtro } })),
  });
}

export function useRecalcular() {
  const invalidar = useInvalidar();
  return useMutation<Recalculo, ErrorApi, void>({
    mutationFn: () => desenvolver(api.POST('/api/sugerencias/recalcular')),
    onSuccess: () => invalidar(['sugerencias']),
  });
}

/** Aprobar suma la línea a la remisión en borrador del par, o crea una. */
export function useAprobar() {
  const invalidar = useInvalidar();
  return useMutation<Aprobacion, ErrorApi, { id: string; cantidad: number }>({
    mutationFn: ({ id, cantidad }) =>
      desenvolver(
        api.POST('/api/sugerencias/{id}/aprobar', {
          params: { path: { id } },
          body: { cantidad },
        }),
      ),
    onSuccess: () => invalidar(['sugerencias'], ['ficha-zona']),
  });
}

export function useDescartar() {
  const invalidar = useInvalidar();
  return useMutation<unknown, ErrorApi, { id: string; motivo: string }>({
    mutationFn: ({ id, motivo }) =>
      desenvolver(
        api.POST('/api/sugerencias/{id}/descartar', {
          params: { path: { id } },
          body: { motivo },
        }),
      ),
    onSuccess: () => invalidar(['sugerencias'], ['descartes']),
  });
}

/** Informe de descartes desde una fecha (AAAA-MM-DD). */
export function useDescartes(desde: string) {
  return useQuery<InformeDescartes, ErrorApi>({
    queryKey: ['descartes', desde],
    queryFn: () =>
      desenvolver(api.GET('/api/sugerencias/descartes', { params: { query: { desde } } })),
  });
}

export function useConfiguracion() {
  return useQuery<Configuracion, ErrorApi>({
    queryKey: ['configuracion-motor'],
    queryFn: () => desenvolver(api.GET('/api/motor/configuracion')),
  });
}

export function useGuardarConfiguracion() {
  const invalidar = useInvalidar();
  return useMutation<Configuracion, ErrorApi, DatosConfiguracion>({
    mutationFn: (datos) => desenvolver(api.PUT('/api/motor/configuracion', { body: datos })),
    onSuccess: () => invalidar(['configuracion-motor'], ['sugerencias']),
  });
}

/** El ranking con unos pesos sin guardarlos. Es una consulta: sin datos no pide nada. */
export function useVistaPrevia(datos: DatosConfiguracion | null) {
  return useQuery<VistaPrevia, ErrorApi>({
    queryKey: ['vista-previa', datos],
    queryFn: () => desenvolver(api.POST('/api/motor/configuracion/vista-previa', { body: datos! })),
    enabled: datos !== null,
  });
}
