import { renderHook } from '@testing-library/react';
import { tituloFranja, useCuenta } from './franja';

it('tituloFranja', () => {
  expect(tituloFranja(0, 0)).toBe('Hoy ningún acopio reporta faltantes.');
  expect(tituloFranja(1, 1)).toBe('Hoy falta 1 categoría en 1 acopio.');
  expect(tituloFranja(5, 3)).toBe('Hoy faltan 5 categorías en 3 acopios.');
  expect(tituloFranja(2, 1)).toBe('Hoy faltan 2 categorías en 1 acopio.');
});

it('con menos movimiento, la cuenta llega de una vez a la meta', () => {
  const { result, rerender } = renderHook(({ meta }) => useCuenta(meta), {
    initialProps: { meta: 6 },
  });
  expect(result.current).toBe(6);
  rerender({ meta: 3 });
  expect(result.current).toBe(3);
});
