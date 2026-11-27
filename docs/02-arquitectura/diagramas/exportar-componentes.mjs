// Exporta las dos láminas de componentes-y-despliegue.html a PNG (3x, tema claro) para el Word y la bóveda:
//   ../../assets/diagramas/arquitectura-05-componentes-y-conectores.png
//   ../../assets/diagramas/arquitectura-06-despliegue.png
// Uso: node exportar-componentes.mjs   (desde esta carpeta)

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(aqui, '../../../apps/web/package.json'));
const { chromium } = require('playwright');

const html = readFileSync(join(aqui, 'componentes-y-despliegue.html'), 'utf8');
const salidas = ['arquitectura-05-componentes-y-conectores.png', 'arquitectura-06-despliegue.png'];

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ deviceScaleFactor: 3, viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
await pagina.setContent(`<!doctype html><html lang="es" data-theme="light"><head><meta charset="utf-8"></head><body>${html}</body></html>`, { waitUntil: 'networkidle' });
await pagina.evaluate(() => document.fonts.ready);
const laminas = pagina.locator('.lamina');
for (const [i, nombre] of salidas.entries()) {
  await laminas.nth(i).screenshot({ path: join(aqui, '../../assets/diagramas', nombre) });
  console.log(`listo: ${nombre}`);
}
await navegador.close();
