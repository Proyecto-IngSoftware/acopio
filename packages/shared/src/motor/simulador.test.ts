import { generador, simular } from './simulador.js';

const base = { zonas: 8, acopios: 4, categorias: 5, dias: 14 };

describe('simulador', () => {
  it('el generador con la misma semilla da la misma serie, en [0, 1)', () => {
    const a = generador(42);
    const b = generador(42);
    const serie = Array.from({ length: 50 }, () => a());
    expect(Array.from({ length: 50 }, () => b())).toEqual(serie);
    expect(serie.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('misma semilla, mismo informe', () => {
    expect(simular({ semilla: 42, ...base })).toEqual(simular({ semilla: 42, ...base }));
  });

  it('otra semilla da otro informe', () => {
    expect(simular({ semilla: 7, ...base })).not.toEqual(simular({ semilla: 42, ...base }));
  });

  it('informa las tres estrategias con números acotados', () => {
    const r = simular({ semilla: 42, ...base });
    expect(Object.keys(r.estrategias).sort()).toEqual(['cercania', 'igualitario', 'motor']);
    for (const e of Object.values(r.estrategias)) {
      expect(e.proporcionVencida).toBeGreaterThanOrEqual(0);
      expect(e.proporcionVencida).toBeLessThanOrEqual(1);
      expect(e.coberturaPromedio).toBeGreaterThanOrEqual(0);
      expect(e.coberturaPromedio).toBeLessThanOrEqual(1);
      expect(e.desviacionCobertura).toBeGreaterThanOrEqual(0);
    }
  });

  it('las tres estrategias reparten el mismo escenario: entra lo mismo a los acopios', () => {
    const r = simular({ semilla: 42, ...base });
    const entradas = Object.values(r.estrategias).map((e) => e.totalEntrado);
    expect(new Set(entradas).size).toBe(1);
  });
});
