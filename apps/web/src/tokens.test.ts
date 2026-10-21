import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Una clase de un token que no existe no falla en ningún lado: Tailwind no genera nada y el texto
// sale con el tamaño heredado (P-086). Esto revisa la escala de texto y los espacios del tema.
const tema = readFileSync(join(process.cwd(), '../../packages/ui-tokens/src/tailwind.css'), 'utf8');
const textos = new Set([...tema.matchAll(/--text-([a-z0-9-]+?):/g)].map((m) => m[1]));
const espacios = new Set([...tema.matchAll(/--spacing-space-([a-z0-9]+):/g)].map((m) => m[1]));

function sinDefinir(fuente: string): string[] {
  const faltan: string[] = [];
  for (const m of fuente.matchAll(/\btext-((?:display|headline|body|label)-[a-z0-9-]+)/g))
    if (!textos.has(m[1]!)) faltan.push(m[0]);
  for (const m of fuente.matchAll(/-space-([a-z0-9]+)\b/g))
    if (!espacios.has(m[1]!)) faltan.push(m[0].slice(1));
  return faltan;
}

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const ruta = join(dir, f);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [ruta] : [];
  });
}

it('detecta un token de texto o de espacio que el tema no define', () => {
  expect(sinDefinir('gap-space-sm text-label-md text-label-sm gap-space-2xs')).toEqual([
    'text-label-sm',
    'space-2xs',
  ]);
});

it('cada token de texto y de espacio que usa el código existe en ui-tokens', () => {
  // Vitest corre desde apps/web
  const faltan = archivos(join(process.cwd(), 'src')).flatMap((ruta) =>
    sinDefinir(readFileSync(ruta, 'utf8')).map((c) => `${ruta.split('/src/')[1]}: ${c}`),
  );
  expect(faltan).toEqual([]);
});
