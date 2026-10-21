import { afterEach, vi } from 'vitest';
import { prefiereMenosMovimiento, retrasoEntrada } from './movimiento';

afterEach(() => vi.unstubAllGlobals());

it('sin matchMedia (jsdom) se comporta como con menos movimiento', () => {
  vi.stubGlobal('matchMedia', undefined);
  expect(prefiereMenosMovimiento()).toBe(true);
});

it('lee la preferencia del sistema', () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }));
  expect(prefiereMenosMovimiento()).toBe(false);
});

it('el retraso crece 60 ms por fila y se detiene en la sexta', () => {
  expect(retrasoEntrada(0)).toEqual({ animationDelay: '0ms' });
  expect(retrasoEntrada(2)).toEqual({ animationDelay: '120ms' });
  expect(retrasoEntrada(9)).toEqual({ animationDelay: '300ms' });
});
