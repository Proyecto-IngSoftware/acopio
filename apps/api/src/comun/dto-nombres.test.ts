import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Dos DTO con el mismo nombre se pisan en el contrato OpenAPI sin aviso. */
describe('nombres de DTO', () => {
  it('no hay dos clases DTO con el mismo nombre', () => {
    const raiz = join(__dirname, '..');
    const nombres = new Map<string, string[]>();
    const archivos = readdirSync(raiz, { recursive: true, encoding: 'utf8' }).filter(
      (f) => f.endsWith('.ts') && !f.startsWith('generado'),
    );
    for (const archivo of archivos) {
      const texto = readFileSync(join(raiz, archivo), 'utf8');
      for (const m of texto.matchAll(/class (\w+Dto) extends crearDto/g)) {
        nombres.set(m[1], [...(nombres.get(m[1]) ?? []), archivo]);
      }
    }
    const repetidos = [...nombres].filter(([, donde]) => donde.length > 1);
    expect(nombres.size).toBeGreaterThan(20);
    expect(repetidos).toEqual([]);
  });
});
