// Recorrido público de turnos (Bloque 5, HU-03): P7 con la jornada llena marcada, su vista de mapa
// con la etiqueta de cupos, reservar en «Armar mercados (demo)» con un correo único, P8 con su
// código, el .ics, cancelar y comprobar en la API que el cupo volvió. A 360 × 640, contra la API
// del Compose con el seed:demo. No inicia sesión y deja la demo como estaba.
//
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/portal-turnos.mjs
// Escribe las capturas en docs/03-diseno/stitch/ salvo con CAPTURAS=no.
// Con CAPTURAS_WORD=<carpeta> guarda además cada captura del alto de la pantalla, para el Word. Sale con 1 si falla un paso.
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
async function jornada(titulo) {
  const r = await fetch(`${WEB}/api/turnos/jornadas`);
  const j = (await r.json()).find((x) => x.titulo === titulo);
  if (!j) throw new Error(`no está «${titulo}» en la API`);
  return j;
}

let antes = 0;
let jornadaId = '';
// En local es Acopio Chapinero; en el servidor la demo vive en otro acopio
let lugarArmar = '';

await paso('P7 lista las jornadas y marca la llena', async () => {
  const armar = await jornada('Armar mercados (demo)');
  antes = armar.ocupados;
  jornadaId = armar.id;
  lugarArmar = armar.lugar.nombre;
  await p.goto(`${WEB}/voluntariado?vista=lista`);
  await p.getByRole('heading', { level: 1, name: 'Voluntariado' }).waitFor();
  // La tira de días reemplaza el filtro «Día» (línea visual, fase 2)
  await p
    .getByRole('group', { name: 'Día' })
    .getByRole('button', { name: 'Todos los días' })
    .waitFor();
  // La marca va en la fila, fuera del enlace del título
  const llena = p
    .getByRole('article')
    .filter({ has: p.getByRole('link', { name: 'Clasificar ropa donada (demo)', exact: true }) });
  // Sembrada hace días, la llena puede quedar a menos de 12 horas: «Reservas cerradas» le gana a «Llena»
  await llena.getByText(/^(Llena|Reservas cerradas)$/).waitFor();
  if (await p.getByText(/personas presentes/i).count()) throw new Error('dice personas presentes');
  await revisar(p, 'P7', 'P07-voluntariado/construida.png');
});

await paso('P7 en «Mapa» pone la etiqueta de cupos sobre el acopio de la demo', async () => {
  await p.locator('label', { hasText: 'Mapa' }).click();
  // El mapa es la vista por defecto: elegirlo quita `vista` de la URL
  if (new URL(p.url()).searchParams.has('vista')) throw new Error(`url ${p.url()}`);
  // El acopio de la demo tiene «Clasificar ropa donada (demo)» llena y, si sigue en plazo, «Armar mercados»
  const etiqueta = /(FALTAN? \d+ PERSONAS?|QUEDAN? \d+ CUPOS?|LLENA)( \+\d+)?/;
  // Hay más acopios con jornadas: se busca el de «Armar mercados (demo)» por su título
  const punto = p.locator(`.leaflet-marker-icon[title^="${lugarArmar}"]`, { hasText: etiqueta });
  await punto.first().waitFor();
  await punto.first().click();
  // A menos de 12 horas, «Clasificar ropa donada» cierra reservas y sale del mapa: vale cualquiera
  await p
    .getByRole('link', { name: /(Clasificar ropa donada|Armar mercados) \(demo\)/ })
    .first()
    .waitFor();
  await revisar(p, 'P7 mapa', 'P07-voluntariado/construida-mapa.png');
  await p.locator('label', { hasText: 'Lista' }).click();
});

await paso('P7 en «Mapa» filtra con los chips y «Todas» los quita', async () => {
  await p.goto(`${WEB}/voluntariado`);
  await p.locator('.leaflet-marker-icon').first().waitFor();
  // Se usa el chip que tenga jornadas: cuál depende de las reservas y del plazo de la demo
  const chips = [
    { nombre: /^Falta gente (\d+)$/, estado: 'faltan', etiqueta: /FALTAN? \d+ PERSONAS?/ },
    { nombre: /^Con cupos (\d+)$/, estado: 'cupos', etiqueta: /QUEDAN? \d+ CUPOS?/ },
  ];
  let usado = null;
  for (const c of chips) {
    const boton = p.getByRole('button', { name: c.nombre });
    // La cuenta va al final del texto del chip
    const n = Number((await boton.textContent())?.match(/(\d+)\s*$/)?.[1] ?? 0);
    if (n > 0) {
      usado = { ...c, boton };
      break;
    }
  }
  if (!usado) throw new Error('ningún chip tiene jornadas');
  await usado.boton.click();
  await p.waitForFunction(
    (estado) => new URL(window.location.href).searchParams.get('estado') === estado,
    usado.estado,
  );
  if ((await usado.boton.getAttribute('aria-pressed')) !== 'true')
    throw new Error('chip sin marcar');
  const textos = await p.locator('.leaflet-marker-icon').allTextContents();
  if (!textos.length || textos.some((t) => !usado.etiqueta.test(t))) {
    throw new Error(`etiquetas con ${usado.estado}: ${textos.join(' | ')}`);
  }
  await p.getByRole('button', { name: /^Todas \d+$/ }).click();
  await p.waitForFunction(() => !new URL(window.location.href).searchParams.has('estado'));
  // El paso siguiente reserva desde la lista
  await p.locator('label', { hasText: 'Lista' }).click();
});

await paso('reserva en «Armar mercados (demo)» con un correo nuevo', async () => {
  // El título abre la jornada; «Reservar en …» es otro enlace de la misma fila
  await p.getByRole('link', { name: 'Armar mercados (demo)', exact: true }).click();
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
