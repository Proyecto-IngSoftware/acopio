import type { UnidadBase } from '@acopio/shared';

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
      lineas: e.lineas.map((l) => (l === repetida ? { ...l, cantidad: l.cantidad + 1 } : l)),
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
