// Convierte la salida de scripts/pruebas-manuales.sh en capturas de terminal, una por
// prueba, para el anexo del Word. Usa el Chromium de Playwright que instala apps/web.
// Uso: node capturas-consola.mjs evidencia/avance-04   (desde docs/entregas)
// Lee <carpeta>/pruebas-api.txt y <carpeta>/contenedores.txt; escribe <carpeta>/consola/*.png.

import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(aqui, '../../apps/web/package.json'));
const { chromium } = require('playwright');

const carpeta = resolve(process.argv[2] ?? 'evidencia/avance-04');
const salida = join(carpeta, 'consola');
mkdirSync(salida, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Cada bloque empieza con «### N. Título»; la cabecera del archivo se descarta.
const texto = readFileSync(join(carpeta, 'pruebas-api.txt'), 'utf8');
const bloques = texto
  .split(/\n(?=### )/)
  .filter((b) => b.startsWith('### '))
  .map((b) => {
    const [titulo, ...resto] = b.trim().split('\n');
    return { titulo: titulo.replace(/^### /, ''), lineas: resto };
  });
if (existsSync(join(carpeta, 'contenedores.txt'))) {
  bloques.push({
    titulo: 'Contenedores y volúmenes (docker ps · docker volume ls)',
    lineas: readFileSync(join(carpeta, 'contenedores.txt'), 'utf8').trimEnd().split('\n'),
  });
}

// Colorea por tipo de línea: comando, código HTTP, cuerpo.
const pintar = (l) => {
  if (l.startsWith('$ ')) return `<span class="pr">$</span> <span class="cmd">${esc(l.slice(2))}</span>`;
  const http = l.match(/^HTTP(\/1\.1)? (\d{3})/);
  if (http) return `<span class="${http[2] < '400' ? 'ok' : 'err'}">${esc(l)}</span>`;
  if (/^Set-Cookie:/i.test(l)) return `<span class="hdr">${esc(l)}</span>`;
  return esc(l)
    .replace(/(&quot;|")([^"]+)(")(\s*:)/g, '<span class="key">"$2"</span>$4')
    .replace(/:\s*("[^"]*")/g, ': <span class="str">$1</span>');
};

const html = (b) => `<!doctype html><meta charset="utf-8">
<style>
  body{margin:0;background:#fff;font-family:'JetBrains Mono',Consolas,monospace}
  .ventana{width:860px;margin:16px;border-radius:10px;overflow:hidden;background:#1C1917;box-shadow:0 2px 10px rgba(0,0,0,.25)}
  .barra{display:flex;align-items:center;gap:7px;padding:9px 14px;background:#292524;color:#D6D3D1;font:600 13px Inter,Arial,sans-serif}
  .barra i{width:11px;height:11px;border-radius:50%;display:inline-block}
  .barra span{margin-left:10px}
  pre{margin:0;padding:14px 18px;color:#E7E5E4;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-all}
  .pr{color:#5EEAD4}.cmd{color:#FDE68A}.ok{color:#86EFAC;font-weight:700}.err{color:#FCA5A5;font-weight:700}
  .hdr{color:#93C5FD}.key{color:#93C5FD}.str{color:#FDBA74}
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@600&family=JetBrains+Mono&display=block">
<div class="ventana"><div class="barra"><i style="background:#F87171"></i><i style="background:#FBBF24"></i><i style="background:#4ADE80"></i><span>${esc(b.titulo)}</span></div>
<pre>${b.lineas.map(pintar).join('\n')}</pre></div>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ deviceScaleFactor: 2 });
for (const [i, b] of bloques.entries()) {
  await pagina.setContent(html(b), { waitUntil: 'networkidle' });
  await pagina.evaluate(() => document.fonts.ready);
  const nombre = `${String(i + 1).padStart(2, '0')}.png`;
  await pagina.locator('.ventana').screenshot({ path: join(salida, nombre) });
  console.log(`listo: ${nombre} · ${b.titulo}`);
}
await navegador.close();
