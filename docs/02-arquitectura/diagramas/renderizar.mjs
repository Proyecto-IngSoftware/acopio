// Renderiza mmd/*.mmd a svg/<nombre>.svg y a ../../assets/diagramas/<nombre>.png (a 3x).
// Usa el Chromium de Playwright que instala apps/web y Mermaid desde jsDelivr.
// Uso: node renderizar.mjs [nombre ...]   (desde esta carpeta, después de node build.mjs)
// Sin nombres renderiza todos los .mmd.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(aqui, '../../../apps/web/package.json'));
const { chromium } = require('playwright');

const dirMmd = join(aqui, 'mmd');
const dirSvg = join(aqui, 'svg');
const dirPng = join(aqui, '../../assets/diagramas');
mkdirSync(dirSvg, { recursive: true });

const pedidos = process.argv.slice(2);
const nombres = readdirSync(dirMmd)
  .filter((f) => f.endsWith('.mmd'))
  .map((f) => f.replace(/\.mmd$/, ''))
  .filter((n) => pedidos.length === 0 || pedidos.includes(n));

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ deviceScaleFactor: 3 });
await pagina.setContent(`<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=block">
<style>body{margin:0;background:#fff;font-family:Inter,sans-serif}#lienzo{display:inline-block;padding:24px}</style>
<div id="lienzo"></div>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
  window.dibujar = async (id, codigo) => {
    const { svg } = await mermaid.render(id, codigo);
    document.getElementById('lienzo').innerHTML = svg;
    return svg;
  };
</script>`);
await pagina.waitForFunction(() => typeof window.dibujar === 'function');
// Mermaid mide el texto al dibujar: la fuente tiene que estar cargada antes.
await pagina.evaluate(() => document.fonts.load('15px Inter').then(() => document.fonts.ready));

for (const nombre of nombres) {
  const codigo = readFileSync(join(dirMmd, `${nombre}.mmd`), 'utf8');
  const svg = await pagina.evaluate(([id, c]) => window.dibujar(id, c), [`d-${nombre}`, codigo]);
  writeFileSync(join(dirSvg, `${nombre}.svg`), svg);
  await pagina.locator('#lienzo').screenshot({ path: join(dirPng, `${nombre}.png`) });
  console.log(`listo: ${nombre}`);
}
await navegador.close();
