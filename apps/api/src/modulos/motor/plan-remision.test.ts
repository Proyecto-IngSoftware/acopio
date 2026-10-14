import { PlanRemision } from './plan-remision';

describe('PlanRemision', () => {
  it('suma dos veces la misma categoría y ordena por categoría', () => {
    const p = new PlanRemision().agregar('b', 3).agregar('a', 2).agregar('b', 4);
    expect(p.lineas()).toEqual([
      { categoriaId: 'a', cantidad: 2 },
      { categoriaId: 'b', cantidad: 7 },
    ]);
  });

  it('rechaza una línea que supera el movible y dice cuánto cabe', () => {
    const p = new PlanRemision().agregar('a', 10);
    expect(() => p.validarContra(new Map([['a', 6]]))).toThrow(
      expect.objectContaining({
        codigo: 'LINEA_EXCEDE_MOVIBLE',
        estado: 422,
        detalles: { categoriaId: 'a', maximo: 6 },
      }),
    );
  });

  it('una categoría sin movible tiene máximo 0', () => {
    expect(() => new PlanRemision().agregar('x', 1).validarContra(new Map())).toThrow(
      expect.objectContaining({ codigo: 'LINEA_EXCEDE_MOVIBLE' }),
    );
  });

  it('no acepta cantidades en cero o negativas', () => {
    expect(() => new PlanRemision().agregar('a', 0)).toThrow();
    expect(() => new PlanRemision().agregar('a', -1)).toThrow();
  });

  it('suma con tres decimales, como movimiento.cantidad', () => {
    expect(new PlanRemision().agregar('a', 0.1).agregar('a', 0.2).lineas()[0]!.cantidad).toBe(0.3);
  });
});
