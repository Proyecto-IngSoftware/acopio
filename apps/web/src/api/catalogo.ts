import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

type S = components['schemas'];
export type Categoria = S['CategoriaDto'];
export type Grupo = Categoria['grupo'];
export type Unidad = Categoria['unidadBase'];
export type CanastaVigente = S['CanastaVigenteDto'];
export type Emergencia = S['EmergenciaDto'];
export type DatosCategoria = S['CrearCategoriaDto'];
export type DatosEmergencia = S['CrearEmergenciaDto'];

export const GRUPOS: Record<Grupo, string> = {
  ALIMENTOS: 'Alimentos',
  AGUA_Y_BEBIDAS: 'Agua y bebidas',
  ASEO_PERSONAL: 'Aseo personal',
  ASEO_DEL_HOGAR: 'Aseo del hogar',
  SALUD: 'Salud',
  ROPA_Y_ABRIGO: 'Ropa y abrigo',
  BEBE: 'Bebé',
  ADULTO_MAYOR: 'Adulto mayor',
  ANIMALES: 'Animales',
  HERRAMIENTAS: 'Herramientas',
};
export const UNIDADES: Record<Unidad, string> = { KILOGRAMO: 'kg', LITRO: 'L', UNIDAD: 'unidad' };

/** «0,15 kg por persona al día» */
export const porPersona = (cantidad: number, unidad: Unidad) =>
  `${cantidad.toLocaleString('es-CO')} ${UNIDADES[unidad]} por persona al día`;

export function useCategorias(filtro: { grupo?: Grupo; archivadas: boolean; q: string }) {
  const q = filtro.q.trim();
  return useQuery<Categoria[], ErrorApi>({
    queryKey: ['categorias', filtro.grupo, filtro.archivadas, q],
    queryFn: async () => {
      if (q) {
        // Búsqueda tolerante a errores (RF-CAT-002)
        const r = await desenvolver(
          api.GET('/api/categorias/buscar', { params: { query: { q } } }),
        );
        return r.map((c) => ({ ...c, sinonimos: [], archivada: false })) as Categoria[];
      }
      return desenvolver(
        api.GET('/api/categorias', {
          params: {
            query: {
              grupo: filtro.grupo,
              incluirArchivadas: filtro.archivadas ? 'true' : undefined,
            } as never,
          },
        }),
      );
    },
  });
}

export function useCanasta() {
  return useQuery<CanastaVigente[], ErrorApi>({
    queryKey: ['canasta'],
    queryFn: () => desenvolver(api.GET('/api/canasta')),
  });
}

export function useEmergenciasConsola() {
  return useQuery<Emergencia[], ErrorApi>({
    queryKey: ['emergencias', 'todas'],
    queryFn: () => desenvolver(api.GET('/api/emergencias')),
  });
}

/** Mutación que al terminar refresca las consultas del catálogo. */
function useCambio<T>(hacer: (datos: T) => Promise<unknown>, claves: string[]) {
  const consultas = useQueryClient();
  return useMutation<unknown, ErrorApi, T>({
    mutationFn: hacer,
    onSuccess: () => {
      for (const c of claves) void consultas.invalidateQueries({ queryKey: [c] });
    },
  });
}

export const useGuardarCategoria = () =>
  useCambio(
    ({ id, datos }: { id?: string; datos: DatosCategoria }) =>
      id
        ? desenvolver(
            api.PATCH('/api/categorias/{id}', {
              params: { path: { id } },
              body: {
                nombre: datos.nombre,
                grupo: datos.grupo,
                perecedero: datos.perecedero,
                sinonimos: datos.sinonimos,
              },
            }),
          )
        : desenvolver(api.POST('/api/categorias', { body: datos })),
    ['categorias', 'canasta'],
  );

export const useArchivarCategoria = () =>
  useCambio(
    ({ id, archivar }: { id: string; archivar: boolean }) =>
      archivar
        ? desenvolver(api.POST('/api/categorias/{id}/archivar', { params: { path: { id } } }))
        : desenvolver(api.POST('/api/categorias/{id}/reactivar', { params: { path: { id } } })),
    ['categorias'],
  );

export const useNuevaVersionCanasta = () =>
  useCambio(
    ({
      id,
      cantidadPersonaDia,
      fuente,
      vigenteDesde,
    }: {
      id: string;
      cantidadPersonaDia: number;
      fuente: string;
      vigenteDesde?: string;
    }) =>
      desenvolver(
        api.POST('/api/categorias/{id}/canasta', {
          params: { path: { id } },
          body: { cantidadPersonaDia, fuente, ...(vigenteDesde ? { vigenteDesde } : {}) } as never,
        }),
      ),
    ['canasta'],
  );

export const useGuardarEmergencia = () =>
  useCambio(
    ({ id, datos }: { id?: string; datos: DatosEmergencia }) =>
      id
        ? desenvolver(
            api.PATCH('/api/emergencias/{id}', { params: { path: { id } }, body: datos as never }),
          )
        : desenvolver(api.POST('/api/emergencias', { body: datos as never })),
    ['emergencias'],
  );

export const useCerrarEmergencia = () =>
  useCambio(
    ({ id, motivo }: { id: string; motivo: string }) =>
      desenvolver(
        api.POST('/api/emergencias/{id}/cerrar', { params: { path: { id } }, body: { motivo } }),
      ),
    ['emergencias'],
  );

/** Categorías vigentes sin sesión: el filtro del mapa público (P5). */
export function useCategoriasVigentes() {
  return useQuery<Categoria[], ErrorApi>({
    queryKey: ['categorias', 'vigentes'],
    queryFn: async () =>
      (await desenvolver(api.GET('/api/categorias/vigentes'))) as unknown as Categoria[],
  });
}

export type ResultadoBusqueda = S['ResultadoBusquedaDto'];

/** C4: búsqueda tolerante a errores y tildes (RF-INV-001). No consulta con el campo vacío. */
export function useBuscarCategorias(q: string) {
  const texto = q.trim();
  return useQuery<ResultadoBusqueda[], ErrorApi>({
    queryKey: ['categorias', 'buscar', texto],
    enabled: texto.length > 0,
    queryFn: () =>
      desenvolver(api.GET('/api/categorias/buscar', { params: { query: { q: texto } } })),
  });
}

export type CodigoBarras = Omit<S['CodigoBarrasDto'], 'contenido' | 'creadoPor'> & {
  // El contrato tipa los campos nullable como arreglos (P-031)
  contenido: number | null;
  creadoPor: string | null;
};

/** Escáner: la categoría de un código, o un ErrorApi 404 `EAN_DESCONOCIDO` (RF-INV-002). */
export const consultarCodigo = async (ean: string) =>
  (await desenvolver(
    api.GET('/api/codigos-barras/{ean}', { params: { path: { ean } } }),
  )) as unknown as CodigoBarras;

export interface DatosAsociar {
  ean: string;
  categoriaId: string;
  contenido?: number;
}

/** Escáner: asocia un código nuevo a una categoría; el de un Operador queda sin revisar (RF-CAT-004). */
export function useAsociarCodigo() {
  const consultas = useQueryClient();
  return useMutation<CodigoBarras, ErrorApi, DatosAsociar>({
    mutationFn: async (datos) =>
      (await desenvolver(
        api.POST('/api/codigos-barras', { body: datos }),
      )) as unknown as CodigoBarras,
    onSuccess: () => void consultas.invalidateQueries({ queryKey: ['codigos-barras'] }),
  });
}

/** C18: todos los códigos aprendidos, del más nuevo al más viejo (RF-CAT-004). */
export function useCodigos() {
  return useQuery<CodigoBarras[], ErrorApi>({
    queryKey: ['codigos-barras'],
    queryFn: async () =>
      (await desenvolver(api.GET('/api/codigos-barras', {}))) as unknown as CodigoBarras[],
  });
}

export interface CambiosCodigo {
  categoriaId?: string;
  contenido?: number | null;
  revisado?: boolean;
}

/** C18: el Administrador cambia la categoría o el contenido de un código, o lo marca revisado. */
export function useEditarCodigo() {
  const consultas = useQueryClient();
  return useMutation<CodigoBarras, ErrorApi, { ean: string; cambios: CambiosCodigo }>({
    mutationFn: async ({ ean, cambios }) =>
      (await desenvolver(
        api.PATCH('/api/codigos-barras/{ean}', { params: { path: { ean } }, body: cambios }),
      )) as unknown as CodigoBarras,
    onSuccess: () => void consultas.invalidateQueries({ queryKey: ['codigos-barras'] }),
  });
}
