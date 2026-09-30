import { useInfiniteQuery } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

type Pagina = components['schemas']['PaginaBitacoraDto'];
export type RegistroBitacora = Pagina['registros'][number];

export interface FiltrosBitacora {
  usuarioId?: string;
  entidad?: 'usuario' | 'categoria' | 'emergencia';
  destacado?: boolean;
  /** Fecha local AAAA-MM-DD */
  desde?: string;
  hasta?: string;
}

const POR_PAGINA = 30;

// Las fechas del filtro son días locales; la API recibe instantes
const inicioDelDia = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const finDelDia = (d: string) => new Date(`${d}T23:59:59.999`).toISOString();

/** Bitácora paginada (RF-IDE-012). «Cargar más» pide la página siguiente. */
export function useBitacora(filtros: FiltrosBitacora) {
  return useInfiniteQuery<Pagina, ErrorApi>({
    queryKey: ['bitacora', filtros],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      desenvolver(
        api.GET('/api/bitacora', {
          params: {
            query: {
              usuarioId: filtros.usuarioId,
              entidad: filtros.entidad,
              destacado: filtros.destacado ? 'true' : undefined,
              desde: filtros.desde ? inicioDelDia(filtros.desde) : undefined,
              hasta: filtros.hasta ? finDelDia(filtros.hasta) : undefined,
              pagina: pageParam as number,
              porPagina: POR_PAGINA,
            } as never,
          },
        }),
      ),
    getNextPageParam: (ultima, todas) =>
      todas.reduce((n, p) => n + p.registros.length, 0) < ultima.total
        ? ultima.pagina + 1
        : undefined,
  });
}
