export interface CandidatoEntrega {
  acopioId: string;
  nombre: string;
  direccion: string;
  abiertoAhora: boolean;
  distanciaKm: number | null;
  /** Categorías de la donación que este acopio tiene en «no recibir». */
  noRecibe: string[];
}

export interface SugerenciaEntrega extends CandidatoEntrega {
  lineasAceptadas: number;
}

/**
 * Orden de RF-CMP-001D: cuántas líneas acepta completas, después si está abierto
 * ahora y, si hay ubicación, la cercanía. El nombre deja el orden estable.
 */
export function ordenarSugerencias(
  acopios: CandidatoEntrega[],
  categorias: string[],
): SugerenciaEntrega[] {
  return acopios
    .map((a) => ({
      ...a,
      lineasAceptadas: categorias.filter((c) => !a.noRecibe.includes(c)).length,
    }))
    .sort(
      (x, y) =>
        y.lineasAceptadas - x.lineasAceptadas ||
        Number(y.abiertoAhora) - Number(x.abiertoAhora) ||
        (x.distanciaKm ?? Infinity) - (y.distanciaKm ?? Infinity) ||
        x.nombre.localeCompare(y.nombre, 'es'),
    );
}
