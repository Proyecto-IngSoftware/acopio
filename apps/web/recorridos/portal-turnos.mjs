// Recorrido público de turnos (Bloque 5, HU-03): P7 con la jornada llena marcada, reservar en
// «Armar mercados (demo)» con un correo único, P8 con su código, el .ics, cancelar y comprobar en
// la API que el cupo volvió. A 360 × 640, contra la API del Compose con el seed:demo. No inicia
// sesión y deja la demo como estaba.
//
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/portal-turnos.mjs
// Escribe las capturas en docs/03-diseno/stitch/ salvo con CAPTURAS=no. Sale con 1 si falla un paso.
/* global window, document */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WEB = process.env.WEB ?? 'http://localhost:5173';
const DISENO = fileURLToPath(new URL('../../../docs/03-diseno/stitch/', import.meta.url));
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const CORREO = `recorrido-${Date.now()}@demo.acopio.local`;

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
async function jornada(titulo) {
  const r = await fetch(`${WEB}/api/turnos/jornadas`);
  const j = (await r.json()).find((x) => x.titulo === titulo);
  if (!j) throw new Error(`no está «${titulo}» en la API`);
  return j;
}

let antes = 0;
let jornadaId = '';

await paso('P7 lista las jornadas y marca la llena', async () => {
  const armar = await jornada('Armar mercados (demo)');
  antes = armar.ocupados;
  jornadaId = armar.id;
  await p.goto(`${WEB}/voluntariado`);
  await p.getByRole('heading', { level: 1, name: 'Voluntariado' }).waitFor();
  const llena = p.getByRole('link', { name: /Clasificar ropa donada \(demo\)/ });
  await llena.getByText('Llena').waitFor();
  if (await p.getByText(/personas presentes/i).count()) throw new Error('dice personas presentes');
  await revisar(p, 'P7', 'P07-voluntariado/construida.png');
});

await paso('reserva en «Armar mercados (demo)» con un correo nuevo', async () => {
  await p.getByRole('link', { name: /Armar mercados \(demo\)/ }).click();
  await p.getByRole('heading', { level: 1, name: 'Armar mercados (demo)' }).waitFor();
  await p.getByLabel('Nombre', { exact: true }).fill('Recorrido de turnos');
  await p.getByLabel('Correo', { exact: true }).fill(CORREO);
  await p.getByRole('checkbox', { name: /Acepto que guarden/ }).check();
  await revisar(p, 'P7 reservar', 'P07-voluntariado/construida-reservar.png');
  await p.getByRole('button', { name: 'Reservar' }).click();
});

await paso('llega a P8 con el código y el secreto después del #', async () => {
  await p.getByRole('heading', { level: 1, name: 'Tu cupo está reservado' }).waitFor();
  const url = new URL(p.url());
  if (!/^\/voluntariado\/reserva\/[A-Z0-9]{8}$/.test(url.pathname)) throw new Error(url.pathname);
  if (url.hash.length < 10) throw new Error('sin secreto');
  await p.getByText(url.pathname.split('/').at(-1)).waitFor();
  const ahora = await jornada('Armar mercados (demo)');
  if (ahora.ocupados !== antes + 1) throw new Error(`ocupados ${ahora.ocupados}, antes ${antes}`);
  await revisar(p, 'P8', 'P08-mi-reserva/construida.png');
});

await paso('descarga el .ics de la reserva', async () => {
  const [descarga] = await Promise.all([
    p.waitForEvent('download'),
    p.getByRole('button', { name: /Agregar al calendario/ }).click(),
  ]);
  if (!/^reserva-[A-Z0-9]{8}\.ics$/.test(descarga.suggestedFilename())) {
    throw new Error(descarga.suggestedFilename());
  }
});

await paso('cancela la reserva y el cupo vuelve en la API', async () => {
  await p.getByRole('button', { name: 'Cancelar reserva' }).click();
  const hoja = p.getByRole('dialog', { name: '¿Cancelar tu reserva?' });
  await revisar(p, 'P8 cancelar', 'P08-mi-reserva/construida-cancelar.png');
  await hoja.getByRole('button', { name: 'Cancelar reserva' }).click();
  await p.getByRole('heading', { name: 'Cancelaste tu reserva' }).waitFor();
  const r = await fetch(`${WEB}/api/turnos/jornadas/${jornadaId}`);
  const ahora = await r.json();
  if (ahora.ocupados !== antes) throw new Error(`ocupados ${ahora.ocupados}, antes ${antes}`);
});

await paso('P8 sin el # dice que el enlace está incompleto', async () => {
  await p.goto(`${WEB}/voluntariado/reserva/AAAAAAAA`);
  await p.getByRole('heading', { name: 'Este enlace está incompleto' }).waitFor();
  await revisar(p, 'P8 incompleto');
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
