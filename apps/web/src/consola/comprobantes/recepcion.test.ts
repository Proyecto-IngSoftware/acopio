import type { Comprobante } from '../../api/comprobantes';
import {
  cantidadDe,
  cuerpoRecepcion,
  entradas,
  faltaVencimiento,
  iniciar,
  listoParaRegistrar,
  recepcion,
  soloEnteros,
} from './recepcion';

const linea = (extra: Partial<Comprobante['lineas'][number]> = {}) => ({
  id: 'l1',
  categoriaId: 'c1',
  categoria: 'Agua potable',
  unidad: 'LITRO' as const,
  perecedero: false,
  ean: null,
  contenidoUnitario: 1,
  cantidadDeclarada: 12,
  cantidadConfirmada: null,
  venceEn: null,
  motivoDiferencia: null,
  ...extra,
});
const comprobante = (lineas: ReturnType<typeof linea>[]) => ({ lineas }) as unknown as Comprobante;

it('parte de lo declarado en cada línea', () => {
  const e = iniciar(comprobante([linea(), linea({ id: 'l2', cantidadDeclarada: 2.5 })]));
  expect(e.map(cantidadDe)).toEqual([12, 2.5]);
});

it('suma y resta de a uno, sin bajar de cero', () => {
  let e = iniciar(comprobante([linea({ cantidadDeclarada: 1 })]));
  e = recepcion(e, { tipo: 'sumar', id: 'l1', delta: -1 });
  e = recepcion(e, { tipo: 'sumar', id: 'l1', delta: -1 });
  expect(cantidadDe(e[0]!)).toBe(0);
  e = recepcion(e, { tipo: 'sumar', id: 'l1', delta: 1 });
  expect(cantidadDe(e[0]!)).toBe(1);
});

it('lo escrito acepta coma decimal, salvo en presentaciones o unidades, que van enteras', () => {
  let e = iniciar(comprobante([linea(), linea({ id: 'l2', contenidoUnitario: 0.5 })]));
  e = recepcion(e, { tipo: 'escribir', id: 'l1', texto: '4.5' });
  e = recepcion(e, { tipo: 'escribir', id: 'l2', texto: '4,5' });
  expect(cantidadDe(e[0]!)).toBe(4.5);
  expect(cantidadDe(e[1]!)).toBe(45);
  expect(soloEnteros(e[1]!)).toBe(true);
  expect(soloEnteros(iniciar(comprobante([linea({ unidad: 'UNIDAD' })]))[0]!)).toBe(true);
});

it('una perecedera sin fecha y con cantidad pide el vencimiento; en cero no', () => {
  let e = iniciar(comprobante([linea({ perecedero: true })]));
  expect(faltaVencimiento(e[0]!)).toBe(true);
  expect(listoParaRegistrar(e)).toBe(false);
  e = recepcion(e, { tipo: 'vencer', id: 'l1', venceEn: '2026-12-01' });
  expect(faltaVencimiento(e[0]!)).toBe(false);
  expect(listoParaRegistrar(e)).toBe(true);
  const conFecha = iniciar(comprobante([linea({ perecedero: true, venceEn: '2026-11-01' })]));
  expect(faltaVencimiento(conFecha[0]!)).toBe(false);
  const enCero = recepcion(iniciar(comprobante([linea({ perecedero: true })])), {
    tipo: 'escribir',
    id: 'l1',
    texto: '0',
  });
  expect(faltaVencimiento(enCero[0]!)).toBe(false);
});

it('cuenta como entradas solo las líneas con cantidad', () => {
  let e = iniciar(comprobante([linea(), linea({ id: 'l2' })]));
  e = recepcion(e, { tipo: 'escribir', id: 'l2', texto: '0' });
  expect(entradas(e)).toBe(1);
});

it('arma el cuerpo con todas las líneas, el motivo si llegó menos y la fecha si no la traía', () => {
  let e = iniciar(
    comprobante([
      linea(),
      linea({ id: 'l2', perecedero: true, cantidadDeclarada: 2 }),
      linea({ id: 'l3', cantidadDeclarada: 5 }),
    ]),
  );
  e = recepcion(e, { tipo: 'vencer', id: 'l2', venceEn: '2026-12-01' });
  e = recepcion(e, { tipo: 'escribir', id: 'l3', texto: '4' });
  e = recepcion(e, { tipo: 'motivo', id: 'l3', motivo: '  Un paquete roto ' });
  e = recepcion(e, { tipo: 'motivo', id: 'l1', motivo: 'no aplica' });
  expect(cuerpoRecepcion(e, 'a1')).toEqual({
    acopioId: 'a1',
    lineas: [
      { lineaId: 'l1', cantidadConfirmada: 12 },
      { lineaId: 'l2', cantidadConfirmada: 2, venceEn: '2026-12-01' },
      { lineaId: 'l3', cantidadConfirmada: 4, motivoDiferencia: 'Un paquete roto' },
    ],
  });
});
