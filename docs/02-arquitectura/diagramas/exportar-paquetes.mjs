// Exporta las dos láminas de paquetes.html a PNG (3x, tema claro) para el Word y la bóveda:
//   ../../assets/diagramas/arquitectura-03-paquetes-del-monorepo.png
//   ../../assets/diagramas/arquitectura-04-paquetes-de-la-api.png
// paquetes.html es la fuente: se dibuja a mano en SVG y se publica como página.
// Uso: node exportar-paquetes.mjs   (desde esta carpeta)

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(aqui, '../../../apps/web/package.json'));
const { chromium } = require('playwright');

const html = readFileSync(join(aqui, 'paquetes.html'), 'utf8');
const salidas = ['arquitectura-03-paquetes-del-monorepo.png', 'arquitectura-04-paquetes-de-la-api.png'];

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ deviceScaleFactor: 3, viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
await pagina.setContent(`<!doctype html><html data-theme="light"><head><meta charset="utf-8"></head><body>${html}</body></html>`, { waitUntil: 'networkidle' });
await pagina.evaluate(() => document.fonts.ready);
const laminas = pagina.locator('.lamina');
for (const [i, nombre] of salidas.entries()) {
  await laminas.nth(i).screenshot({ path: join(aqui, '../../assets/diagramas', nombre) });
  console.log(`listo: ${nombre}`);
}
await navegador.close();
