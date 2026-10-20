import { cantidadContadaDeLinea, cantidadDeLinea } from './cantidades';

describe('cantidadDeLinea', () => {
  it('admite hasta 10.000', () => {
    expect(cantidadDeLinea.safeParse(10_000).success).toBe(true);
  });
  it('rechaza lo que pasa de 10.000', () => {
    expect(cantidadDeLinea.safeParse(10_000.001).success).toBe(false);
  });
  it('rechaza cero', () => {
    expect(cantidadDeLinea.safeParse(0).success).toBe(false);
  });
});

describe('cantidadContadaDeLinea', () => {
  it('admite cero y 10.000', () => {
    expect(cantidadContadaDeLinea.safeParse(0).success).toBe(true);
    expect(cantidadContadaDeLinea.safeParse(10_000).success).toBe(true);
  });
  it('rechaza lo que pasa de 10.000', () => {
    expect(cantidadContadaDeLinea.safeParse(10_000.001).success).toBe(false);
  });
});
