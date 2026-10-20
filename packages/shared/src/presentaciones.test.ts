import {
  aUnidadBase,
  errorDeLinea,
  errorDeTamano,
  tamanoDePresentacion,
  TOPES,
  UNIDADES_DE_ENTRADA,
} from './presentaciones.js';

describe('constantes', () => {
  it('fija los topes de presentación y de línea', () => {
    expect(TOPES).toEqual({
      presentacion: { KILOGRAMO: 50, LITRO: 50, UNIDAD: 1000 },
      linea: 10_000,
    });
  });

  it('fija las unidades de entrada por categoría', () => {
    expect(UNIDADES_DE_ENTRADA.KILOGRAMO).toEqual([
      { simbolo: 'kg', factor: 1 },
      { simbolo: 'g', factor: 0.001 },
    ]);
    expect(UNIDADES_DE_ENTRADA.LITRO).toEqual([
      { simbolo: 'L', factor: 1 },
      { simbolo: 'ml', factor: 0.001 },
    ]);
    expect(UNIDADES_DE_ENTRADA.UNIDAD).toEqual([{ simbolo: 'und.', factor: 1 }]);
  });
});

describe('aUnidadBase', () => {
  it.each([
    [500, 0.001, 0.5],
    [600, 0.001, 0.6],
    [1.5, 1, 1.5],
    [0.5, 0.001, null], // 0,0005 kg no cabe en tres decimales
    [1, 0.001, 0.001],
  ])('aUnidadBase(%s, %s) → %s', (v, f, esperado) => expect(aUnidadBase(v, f)).toBe(esperado));
});

describe('tamanoDePresentacion', () => {
  it('el tamaño de un paquete es unidades × la suelta de adentro', () => {
    expect(tamanoDePresentacion({ tamano: null, unidades: 12, contiene: { tamano: 0.6 } })).toBe(
      7.2,
    );
    expect(tamanoDePresentacion({ tamano: 0.5, unidades: null, contiene: null })).toBe(0.5);
  });
});

describe('topes', () => {
  it('los topes cortan justo después del límite', () => {
    expect(errorDeTamano(50, 'LITRO')).toBeNull();
    expect(errorDeTamano(50.001, 'LITRO')).toBe('Una presentación llega hasta 50 L');
    expect(errorDeTamano(1000, 'UNIDAD')).toBeNull();
    expect(errorDeLinea(10_000, 'KILOGRAMO')).toBeNull();
    expect(errorDeLinea(10_000.001, 'KILOGRAMO')).not.toBeNull();
  });

  it('el mensaje de línea lleva el símbolo de la unidad', () => {
    expect(errorDeLinea(10_000.001, 'UNIDAD')).toBe('Una línea llega hasta 10.000 und.');
    expect(errorDeTamano(50.001, 'KILOGRAMO')).toBe('Una presentación llega hasta 50 kg');
  });
});
