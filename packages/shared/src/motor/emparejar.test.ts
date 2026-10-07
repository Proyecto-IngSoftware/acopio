import { PESOS_POR_DEFECTO } from './calculo.js';
import { clavePar, emparejar, type EntradaMotor } from './emparejar.js';

const agua = { id: 'agua', nombre: 'Agua potable', unidad: 'LITRO' as const };
const jabon = { id: 'jabon', nombre: 'Jabón de baño', unidad: 'UNIDAD' as const };
const z1 = { id: 'z1', nombre: 'Zona 1', lat: 4.6, lng: -74.1 };
const z2 = { id: 'z2', nombre: 'Zona 2', lat: 4.6, lng: -74.1 };
const cerca = { id: 'cerca', nombre: 'Acopio Cerca', lat: 4.645, lng: -74.1 };
const lejos = { id: 'lejos', nombre: 'Acopio Lejos', lat: 5.05, lng: -74.1 };
const oferta = (acopioId: string, movible: number, categoriaId = 'agua') => ({
  acopioId,
  categoriaId,
  movible,
  superavit: movible,
  noRecibe: false,
  diasParaVencer: null,
});
const demanda = (zonaId: string, necesidad: number, recibido = 0, categoriaId = 'agua') => ({
  zonaId,
  categoriaId,
  necesidad,
  recibido,
  enCamino: 0,
});
const entrada = (e: Partial<EntradaMotor>): EntradaMotor => ({
  zonas: [z1, z2],
  acopios: [cerca, lejos],
  categorias: [agua, jabon],
  demandas: [],
  ofertas: [],
  ...e,
});

describe('emparejar', () => {
  it('la proximidad decide quién atiende, aunque el lejano tenga más (M-06)', () => {
    const r = emparejar(
      entrada({
        demandas: [demanda('z1', 100)],
        ofertas: [oferta('cerca', 100), oferta('lejos', 200)],
      }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ acopioId: 'cerca', zonaId: 'z1', cantidad: 100 });
    expect(r[0]!.justificacion).toContain('Acopio Cerca');
  });

  it('con poco sobrante va primero a la zona más crítica', () => {
    const r = emparejar(
      entrada({
        demandas: [demanda('z1', 100, 80), demanda('z2', 100, 0)],
        ofertas: [oferta('cerca', 30)],
      }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r).toEqual([expect.objectContaining({ zonaId: 'z2', cantidad: 30 })]);
  });

  it('reparte un déficit entre varios acopios y descuenta lo asignado', () => {
    const r = emparejar(
      entrada({
        demandas: [demanda('z1', 150)],
        ofertas: [oferta('cerca', 100), oferta('lejos', 100)],
      }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r.map((s) => [s.acopioId, s.cantidad])).toEqual([
      ['cerca', 100],
      ['lejos', 50],
    ]);
  });

  it('salta un par bloqueado por un descarte reciente', () => {
    const r = emparejar(
      entrada({
        demandas: [demanda('z1', 100)],
        ofertas: [oferta('cerca', 100), oferta('lejos', 100)],
        bloqueados: new Set([clavePar('cerca', 'z1', 'agua')]),
      }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r.map((s) => s.acopioId)).toEqual(['lejos']);
  });

  it('no propone cantidades menores que el mínimo', () => {
    const r = emparejar(
      entrada({ demandas: [demanda('z1', 3)], ofertas: [oferta('cerca', 100)] }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r).toEqual([]);
  });

  it('una categoría por unidades se propone entera y no se queda en un ciclo', () => {
    const r = emparejar(
      entrada({
        demandas: [demanda('z1', 10.4, 0, 'jabon')],
        ofertas: [oferta('cerca', 100, 'jabon')],
      }),
      PESOS_POR_DEFECTO,
      1,
    );
    expect(r.map((s) => s.cantidad)).toEqual([10]);
  });

  it('en empate ordena por cantidad y después por nombre de zona', () => {
    const r = emparejar(
      entrada({
        demandas: [demanda('z2', 50), demanda('z1', 50)],
        ofertas: [oferta('cerca', 100)],
      }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r.map((s) => s.zonaId)).toEqual(['z1', 'z2']);
  });

  it('la justificación cuenta como cobertura solo lo recibido, igual que la ficha', () => {
    const r = emparejar(
      entrada({
        demandas: [
          { zonaId: 'z1', categoriaId: 'agua', necesidad: 1000, recibido: 0, enCamino: 600 },
        ],
        ofertas: [oferta('cerca', 100), oferta('lejos', 100)],
      }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(r).toHaveLength(2);
    for (const s of r) expect(s.justificacion).toMatch(/^Zona 1 tiene 0 % de cobertura/);
  });

  it('el desglose explica el puntaje; el par más lejano de la ronda tiene proximidad 0', () => {
    const [s] = emparejar(
      entrada({ demandas: [demanda('z1', 100)], ofertas: [oferta('cerca', 100)] }),
      PESOS_POR_DEFECTO,
      5,
    );
    expect(s!.desglose).toEqual({ criticidad: 1, urgencia: 0, proximidad: 0, magnitud: 1 });
    expect(s!.puntaje).toBe(0.6);
  });
});
