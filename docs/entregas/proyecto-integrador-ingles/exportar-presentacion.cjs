// Saca una imagen por paso de la presentación. Uso: node exportar-presentacion.cjs <presentación.html> <carpeta>
const { chromium } = require('../../../apps/web/node_modules/playwright');
const { mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const salida = resolve(process.argv[3]);
  mkdirSync(salida, { recursive: true });
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
  await pagina.goto(pathToFileURL(resolve(process.argv[2])).href + '?quieto');
  await pagina.evaluate(() => document.fonts.ready);
  const estado = () => pagina.evaluate(() => [actual, paso].join());
  for (let n = 1, previo = ''; previo !== (await estado()); n++) {
    previo = await estado();
    await pagina.waitForTimeout(150);
    await pagina.screenshot({ path: join(salida, String(n).padStart(2, '0') + '.jpg'), type: 'jpeg', quality: 88 });
    await pagina.keyboard.press('ArrowRight');
  }
  await navegador.close();
})();
