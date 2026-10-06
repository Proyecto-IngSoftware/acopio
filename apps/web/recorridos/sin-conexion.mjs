// Recorrido del cierre del ciclo 3 del Bloque 2: el criterio 3 del bloque, de punta a
// punta, con el build y su service worker. «Sin red, registra tres entradas; la cabecera
// dice "3 sin sincronizar". Al volver la señal se envían solas y el historial las muestra
// con la hora en que ocurrieron y la hora en que llegaron».
//
// Necesita la API del Compose con seed y seed:demo recién corridos, y el build servido:
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/sin-conexion.mjs
// Escribe las capturas en docs/03-diseno/stitch/ salvo con CAPTURAS=no.
// window y document se usan dentro de page.evaluate, que corre en el navegador
/* global window, document */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Debe coincidir con APP_URL: la API rechaza escrituras con cookie desde otro origen
const WEB = process.env.WEB ?? 'http://localhost:5173';
const CHAPINERO = 'd0000000-0000-4000-8000-000000000011';
const DISENO = fileURLToPath(new URL('../../../docs/03-diseno/stitch/', import.meta.url));
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

let bien = 0;
let mal = 0;
const errores = [];

async function paso(nombre, fn) {
  try {
    await fn();
    bien++;
    console.log('ok   ', nombre);
  } catch (e) {
    mal++;
    console.log('FALLA', nombre, '—', String(e.message).split('\n')[0]);
  }
}

async function revisar(p, nombre, carpeta) {
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
  if (carpeta && process.env.CAPTURAS !== 'no') {
    await p.screenshot({ path: `${DISENO}${carpeta}/construida.png`, fullPage: true });
  }
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', (e) => errores.push(e.message));

await paso('operador1 entra con red', async () => {
  await p.goto(`${WEB}/entrar`);
  await p.getByLabel('Nombre de usuario').fill('operador1');
  await p.getByLabel('Contraseña', { exact: true }).fill('demo-acopio-2026');
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForURL(`${WEB}/`);
});

await paso('C4 con red guarda la copia y el service worker controla la página', async () => {
  await p.goto(`${WEB}/consola/acopios/${CHAPINERO}/entrada`);
  await p.getByRole('searchbox', { name: 'Categoría' }).waitFor();
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload();
  await p.getByRole('searchbox', { name: 'Categoría' }).waitFor();
  await p.waitForLoadState('networkidle');
  if (!(await p.evaluate(() => !!navigator.serviceWorker.controller))) {
    throw new Error('el service worker no controla la página');
  }
});

await ctx.setOffline(true);

await paso('sin red, C4 vuelve a abrir y lo avisa', async () => {
  await p.reload();
  await p.getByText(/Las entradas se guardan en este teléfono/).waitFor();
});

const entradas = [
  ['arroz', /^Arroz/, ['5']],
  ['agua', /^Agua potable/, ['3']],
  ['aceite', /^Aceite/, ['2']],
];
for (const [texto, nombre, teclas] of entradas) {
  await paso(`sin red, guarda ${texto} en el teléfono`, async () => {
    await p.getByRole('searchbox', { name: 'Categoría' }).fill(texto);
    await p.getByRole('button', { name: nombre }).first().click();
    const teclado = p.getByRole('group', { name: 'Teclado numérico' });
    for (const t of teclas) await teclado.getByRole('button', { name: t, exact: true }).click();
    await p.getByRole('button', { name: /Guardar .* en el teléfono/ }).click();
    await p.getByText(/guardadas en el teléfono/).waitFor();
  });
}

await paso('la cabecera dice «3 sin sincronizar» y el botón de la cuenta cabe', async () => {
  await p.getByRole('link', { name: '3 sin sincronizar' }).waitFor();
  const cuenta = await p.getByRole('button', { name: /^Cuenta de/ }).boundingBox();
  if (!cuenta || cuenta.x + cuenta.width > 360) {
    throw new Error(
      `el botón de la cuenta se sale: termina en ${cuenta && cuenta.x + cuenta.width}px`,
    );
  }
});

await paso('C4 sin conexión: axe a 360 px y captura', async () => {
  await p.getByRole('searchbox', { name: 'Categoría' }).fill('arroz');
  await p
    .getByRole('button', { name: /^Arroz/ })
    .first()
    .click();
  await p.getByText(/Saldo estimado/).waitFor();
  await revisar(p, 'C4 sin conexión', 'C04-sin-conexion');
  await p.getByRole('button', { name: 'Cambiar' }).click();
});

await paso('«Sin sincronizar» lista las tres: axe y captura', async () => {
  await p.getByRole('link', { name: '3 sin sincronizar' }).click();
  await p.getByRole('heading', { name: 'Por enviar (3)' }).waitFor();
  await revisar(p, 'Sin sincronizar', 'C04-pendientes');
});

await paso('C5 sin red lo explica', async () => {
  await p.goto(`${WEB}/consola/acopios/${CHAPINERO}/salida`);
  await p.getByRole('heading', { name: 'La salida necesita conexión' }).waitFor();
  await revisar(p, 'C5 sin red');
});

await ctx.setOffline(false);

await paso('al volver la señal se envían solas, sin rechazos', async () => {
  await p.goto(`${WEB}/consola/acopios/${CHAPINERO}/inventario`);
  const pastilla = p.getByRole('link', { name: /sin sincronizar|Enviando|rechazad/ });
  await pastilla.waitFor({ timeout: 10_000 }).catch(() => {});
  if (await p.getByRole('link', { name: /rechazad/ }).count()) {
    throw new Error(`la API rechazó entradas: ${await pastilla.textContent()}`);
  }
  await pastilla.waitFor({ state: 'detached', timeout: 20_000 });
});

await paso('el Historial muestra la entrada de arroz con sus dos horas', async () => {
  await p
    .getByRole('link', { name: /^Arroz/ })
    .first()
    .click();
  await p.waitForURL(/inventario\/.+/);
  await p.getByText('Registrada sin conexión').first().waitFor();
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
