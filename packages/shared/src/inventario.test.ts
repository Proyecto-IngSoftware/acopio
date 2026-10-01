import { semaforo, vencimientoEstimado, type MovimientoParaVencimiento } from './inventario.js';

describe('semaforo', () => {
  const u = { minimo: 100, maximo: 400 };

  it('sin umbral no hay semáforo', () => {
    expect(semaforo(50, null)).toBe('SIN_UMBRAL');
  });

  it('por debajo del mínimo es BAJO', () => {
    expect(semaforo(99.999, u)).toBe('BAJO');
    expect(semaforo(0, u)).toBe('BAJO');
  });

  it('desde el mínimo hasta 25 % por encima es CERCA', () => {
    expect(semaforo(100, u)).toBe('CERCA');
    expect(semaforo(125, u)).toBe('CERCA');
  });

  it('en rango es EN_RANGO, incluido el máximo', () => {
    expect(semaforo(125.001, u)).toBe('EN_RANGO');
    expect(semaforo(400, u)).toBe('EN_RANGO');
  });

  it('por encima del máximo es SOBRE', () => {
    expect(semaforo(400.001, u)).toBe('SOBRE');
  });

  it('con mínimo 0, cero es CERCA y cualquier positivo en rango', () => {
    expect(semaforo(0, { minimo: 0, maximo: 10 })).toBe('CERCA');
    expect(semaforo(1, { minimo: 0, maximo: 10 })).toBe('EN_RANGO');
  });
});

describe('vencimientoEstimado', () => {
  const entrada = (cantidad: number, venceEn: string | null): MovimientoParaVencimiento => ({
    tipo: 'ENTRADA',
    signo: 1,
    cantidad,
    venceEn,
  });
  const salida = (cantidad: number): MovimientoParaVencimiento => ({
    tipo: 'SALIDA',
    signo: -1,
    cantidad,
    venceEn: null,
  });

  it('ordena por fecha y descuenta las salidas de lo que vence primero', () => {
    const lotes = vencimientoEstimado([
      entrada(80, '2026-10-30'),
      entrada(40, '2026-10-12'),
      salida(50),
    ]);
    expect(lotes).toEqual([{ venceEn: '2026-10-30', cantidad: 70 }]);
  });

  it('una salida que agota varias fechas', () => {
    const lotes = vencimientoEstimado([
      entrada(10, '2026-10-01'),
      entrada(10, '2026-10-02'),
      entrada(10, '2026-10-03'),
      salida(25),
    ]);
    expect(lotes).toEqual([{ venceEn: '2026-10-03', cantidad: 5 }]);
  });

  it('las entradas sin fecha van al final y un ajuste al alza suma sin fecha', () => {
    const lotes = vencimientoEstimado([
      entrada(5, null),
      entrada(5, '2026-11-01'),
      { tipo: 'AJUSTE', signo: 1, cantidad: 2, venceEn: null },
    ]);
    expect(lotes).toEqual([
      { venceEn: '2026-11-01', cantidad: 5 },
      { venceEn: null, cantidad: 7 },
    ]);
  });

  it('un ajuste a la baja descuenta igual que una salida', () => {
    const lotes = vencimientoEstimado([
      entrada(3, '2026-10-05'),
      { tipo: 'AJUSTE', signo: -1, cantidad: 1, venceEn: null },
    ]);
    expect(lotes).toEqual([{ venceEn: '2026-10-05', cantidad: 2 }]);
  });

  it('no acumula error de punto flotante', () => {
    const lotes = vencimientoEstimado([
      entrada(0.1, '2026-10-05'),
      entrada(0.2, '2026-10-05'),
      salida(0.3),
    ]);
    expect(lotes).toEqual([]);
  });

  it('sin movimientos no hay lotes', () => {
    expect(vencimientoEstimado([])).toEqual([]);
  });
});
