import { useEffect, useState } from 'react';
import { prefiereMenosMovimiento } from '../../componentes/movimiento';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** El título de la franja de la Portada con la necesidad del día (línea visual, ADR-0022). */
export function tituloFranja(categorias: number, acopios: number): string {
  if (categorias === 0) return 'Hoy ningún acopio reporta faltantes.';
  return `Hoy ${categorias === 1 ? 'falta' : 'faltan'} ${plural(categorias, 'categoría', 'categorías')} en ${plural(acopios, 'acopio', 'acopios')}.`;
}

/** Un número que sube de 0 a `meta` en `ms` al aparecer. Con «reducir movimiento» (y en las
 *  pruebas) vale `meta` desde el principio. */
export function useCuenta(meta: number, ms = 700): number {
  const [menos] = useState(prefiereMenosMovimiento);
  const [valor, fijarValor] = useState(0);
  useEffect(() => {
    if (menos) return;
    let inicio: number | null = null;
    let cuadro = 0;
    const paso = (t: number) => {
      inicio ??= t;
      const avance = Math.min(1, (t - inicio) / ms);
      fijarValor(Math.round(meta * avance));
      if (avance < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [meta, ms, menos]);
  return menos ? meta : valor;
}
