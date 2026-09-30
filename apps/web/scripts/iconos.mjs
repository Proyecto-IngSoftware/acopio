// Reescribe icon_names en index.html con los íconos que usa el código, en orden
// alfabético como exige Google Fonts. Uso: node scripts/iconos.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function iconosUsados(dir = new URL('../src', import.meta.url).pathname) {
  const nombres = new Set();
  const recorrer = (d) => {
    for (const f of readdirSync(d)) {
      const ruta = join(d, f);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) {
        const src = readFileSync(ruta, 'utf8');
        for (const m of src.matchAll(/(?:nombre|icono)(?:=|:\s*)["'`]([a-z0-9_]+)["'`]/g))
          nombres.add(m[1]);
      }
    }
  };
  recorrer(dir);
  return [...nombres].sort();
}

if (process.argv[1]?.endsWith('iconos.mjs')) {
  const html = new URL('../index.html', import.meta.url).pathname;
  const lista = iconosUsados().join(',');
  writeFileSync(
    html,
    readFileSync(html, 'utf8').replace(/icon_names=[a-z0-9_,]+/, `icon_names=${lista}`),
  );
  console.log(`icon_names: ${lista}`);
}
