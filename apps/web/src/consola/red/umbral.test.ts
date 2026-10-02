import { errorUmbral } from './umbral';

describe('errorUmbral', () => {
  it('acepta mínimo menor o igual al máximo, también en cero', () => {
    expect(errorUmbral(100, 400, 'KILOGRAMO')).toBeNull();
    expect(errorUmbral(0, 0, 'UNIDAD')).toBeNull();
  });

  it('rechaza un mínimo mayor que el máximo', () => {
    expect(errorUmbral(500, 400, 'KILOGRAMO')).toBe('El mínimo no puede ser mayor que el máximo.');
  });

  it('rechaza números negativos o vacíos', () => {
    expect(errorUmbral(-1, 10, 'LITRO')).toBe('Escribe el mínimo y el máximo, desde cero.');
    expect(errorUmbral(Number.NaN, 10, 'LITRO')).toBe('Escribe el mínimo y el máximo, desde cero.');
  });

  it('en categorías por unidades no acepta decimales', () => {
    expect(errorUmbral(1.5, 10, 'UNIDAD')).toBe(
      'En unidades, el mínimo y el máximo van sin decimales.',
    );
  });
});
