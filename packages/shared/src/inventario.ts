/** Estado del semáforo de una categoría en un acopio (RF-INV-005, V-03). */
export type EstadoSemaforo = 'SIN_UMBRAL' | 'BAJO' | 'CERCA' | 'EN_RANGO' | 'SOBRE';

/** Hasta este margen por encima del mínimo, el saldo está «cerca» (ámbar). */
const MARGEN_CERCA = 0.25;

/** Rojo bajo el mínimo, ámbar hasta 25 % por encima, verde en rango, morado sobre el máximo. */
export function semaforo(
  saldo: number,
  umbral: { minimo: number; maximo: number } | null,
): EstadoSemaforo {
  if (!umbral) return 'SIN_UMBRAL';
  if (saldo < umbral.minimo) return 'BAJO';
  if (saldo > umbral.maximo) return 'SOBRE';
  if (saldo <= umbral.minimo * (1 + MARGEN_CERCA)) return 'CERCA';
  return 'EN_RANGO';
}

export interface MovimientoParaVencimiento {
  cantidad: number;
  signo: 1 | -1;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  /** Solo las entradas traen fecha (`YYYY-MM-DD`). */
  venceEn: string | null;
}

export interface LoteEstimado {
  venceEn: string | null;
  cantidad: number;
}

// Se cuenta en milésimas enteras: la base guarda numeric(12,3)
const aMilesimas = (n: number) => Math.round(n * 1000);

/**
 * Lo que queda de cada fecha de vencimiento, suponiendo que sale primero lo que vence
 * antes (V-02). Las entradas sin fecha y los ajustes al alza van al final, sin fecha.
 */
export function vencimientoEstimado(movimientos: MovimientoParaVencimiento[]): LoteEstimado[] {
  const lotes = new Map<string | null, number>();
  let consumido = 0;
  for (const m of movimientos) {
    const cantidad = aMilesimas(m.cantidad);
    if (m.signo === -1) {
      consumido += cantidad;
      continue;
    }
    const fecha = m.tipo === 'ENTRADA' ? m.venceEn : null;
    lotes.set(fecha, (lotes.get(fecha) ?? 0) + cantidad);
  }
  const ordenados = [...lotes.entries()].sort(([a], [b]) =>
    a === b ? 0 : a === null ? 1 : b === null ? -1 : a.localeCompare(b),
  );
  const resultado: LoteEstimado[] = [];
  for (const [venceEn, cantidad] of ordenados) {
    const descontado = Math.min(cantidad, consumido);
    consumido -= descontado;
    const queda = cantidad - descontado;
    if (queda > 0) resultado.push({ venceEn, cantidad: queda / 1000 });
  }
  return resultado;
}
