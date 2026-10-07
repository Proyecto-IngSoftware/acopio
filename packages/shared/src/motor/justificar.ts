import { formatearCantidad, formatearNumero } from '../formato.js';
import type { UnidadBase } from '../unidades.js';

export interface DatosJustificacion {
  zona: string;
  categoria: string;
  unidad: UnidadBase;
  /** recibido / necesidad: la misma cobertura que muestra la ficha de zona. */
  cobertura: number;
  acopio: string;
  noRecibe: boolean;
  superavit: number;
  /** Lo que el acopio todavía puede mandar en esta ronda. */
  movible: number;
  km: number;
  diasParaVencer: number | null;
}

/** RF-MOT-006: la razón de una sugerencia en una frase. Nadie aprueba un número que no entiende. */
export function justificar(d: DatosJustificacion): string {
  const categoria = d.categoria.toLowerCase();
  const sobra = d.noRecibe
    ? `${d.acopio} no recibe ${categoria} y puede liberar ${formatearCantidad(d.movible, d.unidad)} hasta su mínimo`
    : `${d.acopio} puede mandar ${formatearCantidad(d.movible, d.unidad)} sin bajar de su máximo`;
  const partes = [
    // Hacia abajo: una zona al 99,6 % todavía tiene déficit y no debe leerse «100 %»
    `${d.zona} tiene ${Math.floor(d.cobertura * 100)} % de cobertura en ${categoria}`,
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
