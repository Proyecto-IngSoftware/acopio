/** Unidad base de una categoría del catálogo (RF-CAT-001). Fija por categoría. */
export type UnidadBase = 'LITRO' | 'KILOGRAMO' | 'UNIDAD';

export const SIMBOLO_UNIDAD: Record<UnidadBase, string> = {
  LITRO: 'L',
  KILOGRAMO: 'kg',
  UNIDAD: 'und.',
};
