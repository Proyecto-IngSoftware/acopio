import { ALFABETO_FOLIO, generarFolio, normalizarFolio } from './folio';

describe('folio (RF-CMP-001B)', () => {
  it('tiene el formato ACO-año-5 caracteres', () => {
    expect(generarFolio(2026)).toMatch(/^ACO-2026-[A-HJ-NP-Z2-9]{5}$/);
  });

  it('el alfabeto no tiene caracteres que se confundan', () => {
    expect(ALFABETO_FOLIO).toHaveLength(32);
    expect(ALFABETO_FOLIO).not.toMatch(/[01IO]/);
  });

  it('usa todo el alfabeto', () => {
    const azar = () => Buffer.from([0, 1, 31, 32, 63]);
    expect(generarFolio(2026, azar)).toBe(
      `ACO-2026-${ALFABETO_FOLIO[0]}${ALFABETO_FOLIO[1]}${ALFABETO_FOLIO[31]}${ALFABETO_FOLIO[0]}${ALFABETO_FOLIO[31]}`,
    );
  });

  it('normaliza lo que escribe una persona', () => {
    expect(normalizarFolio(' aco-2026-7kq4m ')).toBe('ACO-2026-7KQ4M');
    expect(normalizarFolio('ACO-2026-7KQ4')).toBeNull();
    expect(normalizarFolio('cualquier cosa')).toBeNull();
  });
});
