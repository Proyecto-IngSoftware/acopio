import { justificar } from './justificar.js';

const base = {
  zona: 'Zona 7',
  categoria: 'Agua potable',
  unidad: 'LITRO' as const,
  cobertura: 0.12,
  acopio: 'Acopio Norte',
  noRecibe: false,
  superavit: 800,
  movible: 800,
  km: 40.6,
  diasParaVencer: null,
};

describe('justificar', () => {
  it('nombra la cobertura, el sobrante y la distancia', () => {
    expect(justificar(base)).toBe(
      'Zona 7 tiene 12 % de cobertura en agua potable; Acopio Norte tiene 800 L sobre su máximo, a 41 km',
    );
  });

  it('con vencimiento, lo dice como estimado', () => {
    expect(justificar({ ...base, diasParaVencer: 4 })).toMatch(
      /; lo más próximo vence en 4 días \(estimado\)$/,
    );
    expect(justificar({ ...base, diasParaVencer: 1 })).toMatch(/vence en 1 día \(estimado\)$/);
    expect(justificar({ ...base, diasParaVencer: 0 })).toMatch(/vence hoy \(estimado\)$/);
  });

  it('un acopio en «no recibir» libera hasta su mínimo', () => {
    expect(justificar({ ...base, noRecibe: true, superavit: 0, movible: 1240.5 })).toContain(
      'Acopio Norte no recibe agua potable y puede liberar 1.240,5 L hasta su mínimo',
    );
  });
});
