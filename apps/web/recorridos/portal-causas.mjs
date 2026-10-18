// Recorrido público de la pieza C: P3, el chip de personas desaparecidas, la ficha con la hoja
// de salida y las causas atendidas, a 360 × 640, contra la API del Compose con el seed:demo
// (las causas «(demo)» de Cruz Roja Colombiana y UNICEF Colombia). No inicia sesión.
//
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/portal-causas.mjs
// Escribe las capturas en docs/03-diseno/stitch/ salvo con CAPTURAS=no.
// Con CAPTURAS_WORD=<carpeta> guarda además cada captura del alto de la pantalla, para el Word. Sale con 1 si falla un paso.
/* global window, document */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WEB = process.env.WEB ?? 'http://localhost:5173';
const DISENO = fileURLToPath(new URL('../../../docs/03-diseno/stitch/', import.meta.url));
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

let bien = 0;
let mal = 0;
const errores = [];
let cerrar = async () => {};

async function paso(nombre, fn) {
  try {
    await fn();
    bien++;
    console.log('ok   ', nombre);
  } catch (e) {
    mal++;
    console.log('FALLA', nombre, '—', String(e.message).split('\n')[0]);
    await cerrar();
  }
}

async function revisar(p, nombre, archivo) {
  await p.waitForTimeout(500);
  await p.addScriptTag({ path: axe });
  const r = await p.evaluate(() => window.axe.run(document));
  const graves = r.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  if (graves.length || ancho > 360) {
    throw new Error(
      `${nombre}: axe ${graves.map((v) => v.id).join(',') || 'ninguna'}, ancho ${ancho}`,
    );
  }
  if (archivo && process.env.CAPTURAS !== 'no') {
    await p.screenshot({ path: `${DISENO}${archivo}`, fullPage: true });
  }
  // Para el Word de los avances: del alto de la pantalla, sin la cabecera fija en medio
  if (archivo && process.env.CAPTURAS_WORD) {
    await p.screenshot({ path: `${process.env.CAPTURAS_WORD}/${archivo.replaceAll('/', '-')}` });
  }
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', (e) => errores.push(e.message));
cerrar = async () => {
  await b.close();
  console.log(`\nErrores de la página: ${errores.length}`);
  for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
  console.log(`Resultado: ${bien} bien, ${mal} mal`);
  process.exit(1);
};
await paso('P3 muestra las causas de la demo con su sello y personas desaparecidas', async () => {
  await p.goto(`${WEB}/causas`);
  await p.getByRole('heading', { level: 1, name: 'Causas' }).waitFor();
  await p.getByText('Mercados para familias damnificadas (demo)').waitFor();
  await p
    .getByText(/Verificada el/)
    .first()
    .waitFor();
  await p.getByRole('heading', { name: 'Personas desaparecidas' }).waitFor();
  await revisar(p, 'P3', 'P03-causas/construida.png');
});

await paso('el chip de personas desaparecidas deja solo los tres enlaces', async () => {
  await p.getByRole('button', { name: 'Personas desaparecidas' }).click();
  const tarjeta = p.getByRole('region', { name: 'Personas desaparecidas' });
  const enlaces = await tarjeta.getByRole('link').count();
  if (enlaces !== 3) throw new Error(`${enlaces} enlaces`);
  if (await p.getByText('Mercados para familias damnificadas (demo)').count()) {
    throw new Error('siguen las causas');
  }
  await p.getByRole('button', { name: 'Todas' }).click();
});

await paso('la ficha avisa antes de salir al sitio oficial', async () => {
  await p.getByRole('link', { name: /Mercados para familias damnificadas \(demo\)/ }).click();
  await p.getByRole('heading', { level: 1, name: /Mercados para familias/ }).waitFor();
  await p.getByText('Verificada por el equipo de Acopio.').waitFor();
  await revisar(p, 'P4', 'P04-ficha-causa/construida.png');
  await p.getByRole('button', { name: /Ir al sitio oficial/ }).click();
  const hoja = p.getByRole('dialog', { name: 'Vas a salir de Acopio' });
  await hoja.getByText('cruzrojacolombiana.org').waitFor();
  const enlace = hoja.getByRole('link', { name: 'Continuar al sitio' });
  if ((await enlace.getAttribute('rel')) !== 'noopener noreferrer') throw new Error('rel');
  await revisar(p, 'hoja de salida', 'P04-ficha-causa/construida-salida.png');
  await hoja.getByRole('button', { name: 'Quedarme aquí' }).click();
});

await paso('causas atendidas muestra la que cerró', async () => {
  await p.goto(`${WEB}/causas/atendidas`);
  await p.getByText('Alimento para animales rescatados (demo)').waitFor();
  await p
    .getByText(/Cerró el/)
    .first()
    .waitFor();
  await revisar(p, 'atendidas', 'P03-causas/construida-atendidas.png');
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
