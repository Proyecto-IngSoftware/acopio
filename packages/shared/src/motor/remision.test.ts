import { estadoTras, puedeRemision, TRANSICIONES_REMISION } from './remision.js';

describe('transiciones de la remisión', () => {
  it('solo un borrador se edita y se despacha', () => {
    expect(puedeRemision('BORRADOR', 'editar')).toBe(true);
    expect(puedeRemision('EN_TRANSITO', 'editar')).toBe(false);
    expect(puedeRemision('BORRADOR', 'despachar')).toBe(true);
    expect(puedeRemision('RECIBIDA', 'despachar')).toBe(false);
  });

  it('se cancela en borrador o en tránsito, nunca después', () => {
    expect(puedeRemision('BORRADOR', 'cancelar')).toBe(true);
    expect(puedeRemision('EN_TRANSITO', 'cancelar')).toBe(true);
    expect(puedeRemision('RECIBIDA', 'cancelar')).toBe(false);
    expect(puedeRemision('CANCELADA', 'cancelar')).toBe(false);
  });

  it('la evidencia y la recepción son de una remisión en tránsito', () => {
    expect(puedeRemision('EN_TRANSITO', 'subirEvidencia')).toBe(true);
    expect(puedeRemision('BORRADOR', 'recibir')).toBe(false);
  });

  it('dice a qué estado lleva cada acción', () => {
    expect(estadoTras('BORRADOR', 'despachar')).toBe('EN_TRANSITO');
    expect(estadoTras('EN_TRANSITO', 'recibir')).toBe('RECIBIDA');
    expect(estadoTras('EN_TRANSITO', 'cancelar')).toBe('CANCELADA');
    expect(estadoTras('BORRADOR', 'editar')).toBe('BORRADOR');
  });

  it('lanza si la acción no vale desde ese estado', () => {
    expect(() => estadoTras('RECIBIDA', 'cancelar')).toThrow();
  });

  it('cada acción tiene al menos un estado de origen', () => {
    for (const t of Object.values(TRANSICIONES_REMISION))
      expect(t.origen.length).toBeGreaterThan(0);
  });
});
