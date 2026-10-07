import { formatearCantidad, formatearNumero } from '../formato.js';
import type { UnidadBase } from '../unidades.js';

export interface DatosJustificacion {
  zona: string;
  categoria: string;
  unidad: UnidadBase;
  /** (recibido + en camino) / necesidad antes de esta sugerencia. */
  cobertura: number;
  acopio: string;
  noRecibe: boolean;
  superavit: number;
  movible: number;
  km: number;
  diasParaVencer: number | null;
}

/** RF-MOT-006: la razón de una sugerencia en una frase. Nadie aprueba un número que no entiende. */
export function justificar(d: DatosJustificacion): string {
  const categoria = d.categoria.toLowerCase();
  const sobra = d.noRecibe
    ? `${d.acopio} no recibe ${categoria} y puede liberar ${formatearCantidad(d.movible, d.unidad)} hasta su mínimo`
    : `${d.acopio} tiene ${formatearCantidad(d.superavit, d.unidad)} sobre su máximo`;
  const partes = [
    `${d.zona} tiene ${Math.round(d.cobertura * 100)} % de cobertura en ${categoria}`,
    `${sobra}, a ${formatearNumero(Math.round(d.km))} km`,
  ];
  if (d.diasParaVencer !== null) {
    const cuando =
      d.diasParaVencer === 0
        ? 'hoy'
        : `en ${d.diasParaVencer} ${d.diasParaVencer === 1 ? 'día' : 'días'}`;
    partes.push(`lo más próximo vence ${cuando} (estimado)`);
  }
  return partes.join('; ');
}
