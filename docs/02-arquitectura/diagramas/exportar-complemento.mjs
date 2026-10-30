// Exporta las láminas del complemento del segundo corte a PNG (3x, tema claro) para el Word
// y la bóveda, en ../../assets/diagramas/:
//   comportamiento.html → comportamiento-01-estados-de-la-donacion.png
//   concurrencia.html   → concurrencia-01-cola-de-correo.png
// Los .html son la fuente: se dibujan a mano en SVG, como paquetes.html.
// Uso: node exportar-complemento.mjs   (desde esta carpeta)

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(aqui, '../../../apps/web/package.json'));
const { chromium } = require('playwright');

const laminas = [
  ['comportamiento.html', 'comportamiento-01-estados-de-la-donacion.png'],
  ['concurrencia.html', 'concurrencia-01-cola-de-correo.png'],
];

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ deviceScaleFactor: 3, viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
for (const [fuente, salida] of laminas) {
  const html = readFileSync(join(aqui, fuente), 'utf8');
  await pagina.setContent(`<!doctype html><html data-theme="light"><head><meta charset="utf-8"></head><body>${html}</body></html>`, { waitUntil: 'networkidle' });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.locator('.lamina').first().screenshot({ path: join(aqui, '../../assets/diagramas', salida) });
  console.log(`listo: ${salida}`);
}
await navegador.close();
