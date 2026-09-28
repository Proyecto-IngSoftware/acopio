import { formatearCantidad, formatearNumero } from './formato.js';

describe('formatearNumero', () => {
  it('usa punto de miles y coma decimal', () => {
    expect(formatearNumero(1240.5)).toBe('1.240,5');
  });

  it('redondea a dos decimales', () => {
    expect(formatearNumero(0.0067)).toBe('0,01');
  });
});

describe('formatearCantidad', () => {
  it.each([
    [1240.5, 'LITRO', '1.240,5 L'],
    [0.25, 'KILOGRAMO', '0,25 kg'],
    [12, 'UNIDAD', '12 und.'],
  ] as const)('%s %s → %s', (valor, unidad, esperado) => {
    expect(formatearCantidad(valor, unidad)).toBe(esperado);
  });
});
