import type { Comprobante, DatosRecepcion } from '../../api/comprobantes';
import { aNumero, limpiarCantidad } from '../inventario/TecladoCantidad';

/** Una línea del folio mientras el Operador confirma lo que llegó. Cantidades en presentaciones. */
export interface LineaRecepcion {
  id: string;
  categoriaId: string;
  categoria: string;
  unidad: Comprobante['lineas'][number]['unidad'];
  perecedero: boolean;
  contenido: number;
  declarada: number;
  /** Lo que escribe el Operador, con coma decimal. */
  texto: string;
  /** El vencimiento que trajo la donación, si lo trajo. */
  venceDeclarado: string | null;
  venceEn: string;
  motivo: string;
}

export type Accion =
  | { tipo: 'sumar'; id: string; delta: 1 | -1 }
  | { tipo: 'escribir'; id: string; texto: string }
  | { tipo: 'vencer'; id: string; venceEn: string }
  | { tipo: 'motivo'; id: string; motivo: string };

const aTexto = (n: number) => String(n).replace('.', ',');

export function iniciar(c: Comprobante): LineaRecepcion[] {
  return c.lineas.map((l) => ({
    id: l.id,
    categoriaId: l.categoriaId,
    categoria: l.categoria,
    unidad: l.unidad,
    perecedero: l.perecedero,
    contenido: l.contenidoUnitario,
    declarada: l.cantidadDeclarada,
    texto: aTexto(l.cantidadDeclarada),
    venceDeclarado: l.venceEn,
    venceEn: '',
    motivo: '',
  }));
}

/** Con presentaciones o en unidades no hay fracciones. */
export const soloEnteros = (l: LineaRecepcion) => l.contenido !== 1 || l.unidad === 'UNIDAD';

export const cantidadDe = (l: LineaRecepcion) => aNumero(l.texto);

export const faltaVencimiento = (l: LineaRecepcion) =>
  l.perecedero && !l.venceDeclarado && cantidadDe(l) > 0 && !l.venceEn;

export const entradas = (lineas: LineaRecepcion[]) =>
  lineas.filter((l) => cantidadDe(l) > 0).length;

export const listoParaRegistrar = (lineas: LineaRecepcion[]) => !lineas.some(faltaVencimiento);

export function recepcion(lineas: LineaRecepcion[], a: Accion): LineaRecepcion[] {
  return lineas.map((l) => {
    if (l.id !== a.id) return l;
    switch (a.tipo) {
      case 'sumar':
        return { ...l, texto: aTexto(Math.max(0, Math.floor(cantidadDe(l)) + a.delta)) };
      case 'escribir': {
        const limpio = limpiarCantidad(a.texto);
        // Sin fracciones se queda la parte entera: «2,5» no puede volverse 25
        return { ...l, texto: soloEnteros(l) ? limpio.split(',')[0]! : limpio };
      }
      case 'vencer':
        return { ...l, venceEn: a.venceEn };
      case 'motivo':
        return { ...l, motivo: a.motivo };
    }
  });
}

/** Todas las líneas, aunque sea en cero: la API exige confirmar cada una. */
export function cuerpoRecepcion(lineas: LineaRecepcion[], acopioId: string): DatosRecepcion {
  return {
    acopioId,
    lineas: lineas.map((l) => {
      const cantidad = cantidadDe(l);
      const motivo = l.motivo.trim();
      return {
        lineaId: l.id,
        cantidadConfirmada: cantidad,
        ...(cantidad > 0 && !l.venceDeclarado && l.venceEn ? { venceEn: l.venceEn } : {}),
        ...(cantidad < l.declarada && motivo ? { motivoDiferencia: motivo } : {}),
      };
    }),
  };
}
