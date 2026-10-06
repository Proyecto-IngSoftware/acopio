import { ordenarSugerencias, type CandidatoEntrega } from './sugerencias';

const acopio = (id: string, extra: Partial<CandidatoEntrega> = {}): CandidatoEntrega => ({
  acopioId: id,
  nombre: id,
  direccion: '',
  abiertoAhora: true,
  distanciaKm: null,
  noRecibe: [],
  ...extra,
});

describe('ordenarSugerencias (RF-CMP-001D)', () => {
  const lineas = ['arroz', 'agua', 'ropa'];

  it('primero el que acepta más líneas', () => {
    const r = ordenarSugerencias(
      [acopio('a', { noRecibe: ['ropa', 'agua'] }), acopio('b', { noRecibe: ['ropa'] })],
      lineas,
    );
    expect(r.map((s) => [s.acopioId, s.lineasAceptadas])).toEqual([
      ['b', 2],
      ['a', 1],
    ]);
  });

  it('a igual cobertura, el abierto ahora y después el más cercano', () => {
    const r = ordenarSugerencias(
      [
        acopio('lejos', { distanciaKm: 9 }),
        acopio('cerrado', { abiertoAhora: false, distanciaKm: 1 }),
        acopio('cerca', { distanciaKm: 2 }),
      ],
      lineas,
    );
    expect(r.map((s) => s.acopioId)).toEqual(['cerca', 'lejos', 'cerrado']);
  });

  it('sin ubicación, la distancia no ordena', () => {
    const r = ordenarSugerencias([acopio('b'), acopio('a')], lineas);
    expect(r.map((s) => s.acopioId)).toEqual(['a', 'b']);
  });
});
