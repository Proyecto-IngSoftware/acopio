import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error módulo JavaScript sin tipos
import { iconosUsados } from '../scripts/iconos.mjs';

it('cada ícono que usa el código está en icon_names de index.html', () => {
  // Vitest corre desde apps/web
  const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
  const declarados = new Set(/icon_names=([a-z0-9_,]+)/.exec(html)![1]!.split(','));
  const faltan = (iconosUsados(join(process.cwd(), 'src')) as string[]).filter(
    (n) => !declarados.has(n),
  );
  expect(faltan).toEqual([]);
});
