import type { UnidadBase } from '@acopio/shared';
import { leerCantidad } from '../componentes/cantidad-base';

export interface CategoriaElegida {
  id: string;
  nombre: string;
  unidadBase: UnidadBase;
  perecedero: boolean;
}

export interface Linea {
  /** Clave de la línea en pantalla; no viaja a la API. */
  id: string;
  categoriaId: string;
  nombre: string;
  unidad: UnidadBase;
  perecedero: boolean;
  ean: string | null;
  /** Lo que trae cada presentación en unidad base, si el código lo sabe. */
  contenido: number | null;
  /** Presentaciones si hay `contenido`; si no, unidad base. */
  cantidad: number;
  /** Lo escrito en la línea libre (kg o L sin presentación), en la unidad que se eligió. */
  texto: string;
  /** Unidad en que se escribió `texto`: 1 es kg o L; 0,001 son g o ml. */
  factor: number;
  /** AAAA-MM-DD, solo para perecederas. Vacío si no se dijo. */
  venceEn: string;
}

export interface Preparacion {
  paso: 1 | 2 | 3;
  lineas: Linea[];
  acopioId: string | null;
  factura: File | null;
}

export type Accion =
  | {
      tipo: 'agregar';
      categoria: CategoriaElegida;
      leido?: { ean: string; contenido: number | null };
    }
  | { tipo: 'cantidad'; id: string; cantidad: number }
  | { tipo: 'escribir'; id: string; texto: string; factor: number }
  | { tipo: 'vence'; id: string; venceEn: string }
  | { tipo: 'quitar'; id: string }
  | { tipo: 'paso'; paso: 1 | 2 | 3 }
  | { tipo: 'acopio'; acopioId: string | null }
  | { tipo: 'factura'; factura: File | null };

export const estadoInicial: Preparacion = { paso: 1, lineas: [], acopioId: null, factura: null };

/** Lo que lleva la línea en unidad base: 12 × 0,6 L = 7,2 L. */
export function cantidadBase(l: Pick<Linea, 'cantidad' | 'contenido'>): number {
  return Math.round(l.cantidad * (l.contenido ?? 1) * 1000) / 1000;
}

/** Línea de kg o L sin presentación: la cantidad se escribe y puede ser fracción. */
export const esLibre = (l: Pick<Linea, 'contenido' | 'unidad'>) =>
  l.contenido === null && l.unidad !== 'UNIDAD';

/** Por qué no se puede avanzar con una línea libre; `null` si está bien. */
export function errorDeEscritura(l: Linea): string | null {
  if (!esLibre(l)) return null;
  const { base, error } = leerCantidad(l.texto, l.factor, l.unidad);
  if (error) return error;
  return base > 0 ? null : 'Escribe una cantidad';
}

/** Mínimo 1 y entera: presentaciones y unidades no se parten; en kg o L sin presentación se
 *  deja la fracción que se teclee. */
function ajustar(l: Linea, cantidad: number): number {
  const entera = l.contenido !== null || l.unidad === 'UNIDAD';
  const n = entera ? Math.floor(cantidad) : cantidad;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

let siguiente = 0;
const nuevoId = () => `linea-${++siguiente}`;

export function agregarLinea(
  e: Preparacion,
  categoria: CategoriaElegida,
  leido?: { ean: string; contenido: number | null },
): Preparacion {
  const ean = leido?.ean ?? null;
  // El mismo código, o la misma categoría buscada por nombre, suma a su línea
  const repetida = e.lineas.find((l) =>
    ean ? l.ean === ean : l.ean === null && l.categoriaId === categoria.id,
  );
  if (repetida) {
    return {
      ...e,
      lineas: e.lineas.map((l) => {
        if (l !== repetida) return l;
        const cantidad = l.cantidad + 1;
        return { ...l, cantidad, texto: String(cantidad).replace('.', ','), factor: 1 };
      }),
    };
  }
  const linea: Linea = {
    id: nuevoId(),
    categoriaId: categoria.id,
    nombre: categoria.nombre,
    unidad: categoria.unidadBase,
    perecedero: categoria.perecedero,
    ean,
    contenido: leido?.contenido ?? null,
    cantidad: 1,
    texto: '1',
    factor: 1,
    venceEn: '',
  };
  return { ...e, lineas: [...e.lineas, linea] };
}

const cambiar = (e: Preparacion, id: string, f: (l: Linea) => Linea): Preparacion => ({
  ...e,
  lineas: e.lineas.map((l) => (l.id === id ? f(l) : l)),
});

export function reducir(e: Preparacion, a: Accion): Preparacion {
  switch (a.tipo) {
    case 'agregar':
      return agregarLinea(e, a.categoria, a.leido);
    case 'cantidad':
      return cambiar(e, a.id, (l) => ({ ...l, cantidad: ajustar(l, a.cantidad) }));
    case 'escribir':
      return cambiar(e, a.id, (l) => {
        const { base, error } = leerCantidad(a.texto, a.factor, l.unidad);
        // Sin texto válido la línea no cuenta nada: `errorDeEscritura` bloquea el avance
        const cantidad = !error && base > 0 ? base : 0;
        return { ...l, texto: a.texto, factor: a.factor, cantidad };
      });
    case 'vence':
      return cambiar(e, a.id, (l) => ({ ...l, venceEn: a.venceEn }));
    case 'quitar':
      return { ...e, lineas: e.lineas.filter((l) => l.id !== a.id) };
    case 'paso':
      return { ...e, paso: a.paso };
    case 'acopio':
      return { ...e, acopioId: a.acopioId };
    case 'factura':
      return { ...e, factura: a.factura };
  }
}
