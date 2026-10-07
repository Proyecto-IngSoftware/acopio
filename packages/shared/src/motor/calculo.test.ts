import type { MovimientoParaVencimiento } from '../inventario.js';
import {
  PESOS_POR_DEFECTO,
  coberturaGlobal,
  diasEntre,
  estadoAcopio,
  estadoZona,
  necesidad,
  pesosValidos,
  puntaje,
  urgencia,
} from './calculo.js';

describe('necesidad', () => {
  it('es canasta × población × horizonte', () => {
    expect(necesidad(15, 1200, 7)).toBe(126000);
  });

  it('redondea a milésimas', () => {
    expect(necesidad(0.0067, 333, 7)).toBe(15.618);
  });
});

describe('estadoZona', () => {
  it('descuenta lo recibido y lo que va en camino', () => {
    expect(estadoZona(100, 30, 20)).toEqual({
      necesidad: 100,
      recibido: 30,
      enCamino: 20,
      deficit: 50,
      cobertura: 0.3,
      criticidad: 0.5,
    });
  });

  it('con más de lo necesario no hay déficit y la cobertura se topa en 1', () => {
    expect(estadoZona(100, 120, 0)).toMatchObject({ deficit: 0, cobertura: 1, criticidad: 0 });
  });

  it('sin necesidad la categoría no entra al cálculo', () => {
    expect(estadoZona(0, 10, 0)).toBeNull();
  });
});

describe('coberturaGlobal', () => {
  it('promedia las coberturas topadas en 1 (M-11)', () => {
    expect(coberturaGlobal([0.2, 1.5, 0.5])).toBeCloseTo(1.7 / 3);
  });

  it('sin categorías no hay cobertura', () => {
    expect(coberturaGlobal([])).toBeNull();
  });
});

describe('estadoAcopio', () => {
  const base = {
    saldo: 80,
    umbral: { minimo: 10, maximo: 50 },
    noRecibe: false,
    comprometido: 5,
    perecedero: false,
    movimientos: [],
  };

  it('sin umbral no hay excedente (M-12)', () => {
    expect(estadoAcopio({ ...base, umbral: null }, '2026-10-06')).toMatchObject({
      movible: 0,
      superavit: 0,
      aviso: 'SIN_UMBRAL',
    });
  });

  it('libera lo que pasa del máximo, menos lo comprometido en borradores', () => {
    expect(estadoAcopio(base, '2026-10-06')).toEqual({
      superavit: 30,
      vencido: 0,
      movible: 25,
      diasParaVencer: null,
      aviso: null,
    });
  });

  it('en «no recibir» libera hasta el mínimo', () => {
    expect(estadoAcopio({ ...base, noRecibe: true }, '2026-10-06').movible).toBe(65);
  });

  it('nunca es negativo', () => {
    expect(estadoAcopio({ ...base, saldo: 20 }, '2026-10-06').movible).toBe(0);
  });

  it('lo vencido no se mueve y la urgencia sale de lo que vence después', () => {
    const entrada = (cantidad: number, venceEn: string): MovimientoParaVencimiento => ({
      tipo: 'ENTRADA',
      signo: 1,
      cantidad,
      venceEn,
    });
    const r = estadoAcopio(
      {
        ...base,
        umbral: { minimo: 0, maximo: 20 },
        comprometido: 0,
        perecedero: true,
        movimientos: [entrada(30, '2026-10-01'), entrada(50, '2026-10-20')],
      },
      '2026-10-06',
    );
    expect(r).toMatchObject({ vencido: 30, movible: 30, diasParaVencer: 14 });
  });
});

describe('urgencia', () => {
  it('es 0 sin fecha y 1 / (1 + días) con fecha', () => {
    expect(urgencia(null)).toBe(0);
    expect(urgencia(0)).toBe(1);
    expect(urgencia(4)).toBe(0.2);
  });
});

describe('puntaje', () => {
  it('suma los componentes con sus pesos', () => {
    expect(
      puntaje({ criticidad: 1, urgencia: 0, proximidad: 1, magnitud: 1 }, PESOS_POR_DEFECTO),
    ).toBe(0.75);
  });
});

describe('pesosValidos', () => {
  it('acepta pesos que suman 1 con tolerancia de 0,001', () => {
    expect(pesosValidos(PESOS_POR_DEFECTO)).toBe(true);
    expect(
      pesosValidos({ criticidad: 0.4995, urgencia: 0.25, proximidad: 0.15, magnitud: 0.1 }),
    ).toBe(true);
  });

  it('rechaza los que no suman 1 o tienen un negativo', () => {
    expect(
      pesosValidos({ criticidad: 0.43, urgencia: 0.25, proximidad: 0.15, magnitud: 0.15 }),
    ).toBe(false);
    expect(pesosValidos({ criticidad: 1.2, urgencia: -0.2, proximidad: 0, magnitud: 0 })).toBe(
      false,
    );
  });
});

describe('diasEntre', () => {
  it('cuenta días de calendario', () => {
    expect(diasEntre('2026-10-06', '2026-10-20')).toBe(14);
    expect(diasEntre('2026-10-06', '2026-10-06')).toBe(0);
  });
});
