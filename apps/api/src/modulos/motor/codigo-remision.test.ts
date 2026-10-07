import { generarCodigoRemision } from './codigo-remision';

describe('generarCodigoRemision', () => {
  it('tiene la forma R-año-5 caracteres sin ambiguos', () => {
    expect(generarCodigoRemision(2026)).toMatch(/^R-2026-[A-HJ-NP-Z2-9]{5}$/);
  });

  it('usa el azar que recibe', () => {
    expect(generarCodigoRemision(2026, () => Buffer.from([0, 1, 2, 3, 31]))).toBe('R-2026-ABCD9');
  });
});
