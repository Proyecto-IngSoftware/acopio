import { useQuery } from '@tanstack/react-query';
import type { Categoria, ResultadoBusqueda } from '../api/catalogo';
import { leerCategorias } from './datos-locales';

/** «Pañal», «panal» y «PAÑAL» se escriben igual al buscar. */
export const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/**
 * Búsqueda de C4 sin red, sobre la copia del teléfono (O-06): por nombre o sinónimo, sin
 * tildes ni mayúsculas. La tolerancia a errores de tipeo queda para cuando hay conexión.
 */
export function buscarEnCopia(categorias: Categoria[], q: string): ResultadoBusqueda[] {
  const texto = normalizar(q);
  if (!texto) return [];
  return categorias
    .filter((c) => [c.nombre, ...c.sinonimos].some((n) => normalizar(n).includes(texto)))
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      grupo: c.grupo,
      unidadBase: c.unidadBase,
      perecedero: c.perecedero,
      puntaje: 1,
    }));
}

/** Las categorías de la copia local. Corre sin red: es IndexedDB, no la API. */
export function useCategoriasLocales(activo: boolean) {
  return useQuery({
    queryKey: ['local', 'categorias'],
    queryFn: leerCategorias,
    enabled: activo,
    networkMode: 'always',
  });
}
