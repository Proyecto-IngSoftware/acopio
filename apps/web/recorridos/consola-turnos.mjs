// Recorrido de C14 Turnos (Bloque 5) a 360 × 640 con `operador1`: crea una serie de dos fechas,
// ve los inscritos de «Armar mercados (demo)», ajusta un cupo, cierra y reabre las reservas, y
// comprueba cada efecto en la API. Al final devuelve el ajuste y borra la serie que creó, así la
// demo queda como estaba y se puede repetir.
//
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/consola-turnos.mjs
// Escribe las capturas en docs/03-diseno/stitch/C14-turnos/ salvo con CAPTURAS=no.
/* global window, document */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WEB = process.env.WEB ?? 'http://localhost:5173';
const DISENO = fileURLToPath(new URL('../../../docs/03-diseno/stitch/', import.meta.url));
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const CONTRASENA = process.env.DEMO_CONTRASENA ?? 'demo-acopio-2026';
const TITULO = `Recorrido de turnos ${Date.now()}`;
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

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

async function api(metodo, ruta, cookie, cuerpo) {
  const r = await fetch(`${WEB}${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', origin: WEB, cookie },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status} ${await r.text()}`);
  const texto = await r.text();
  return texto ? JSON.parse(texto) : null;
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
const cookie = async () => {
  const c = (await ctx.cookies()).find((x) => x.name === 'acopio_sesion');
  if (!c) throw new Error('no hay cookie de sesión');
  return `${c.name}=${c.value}`;
};
async function entrar(usuario, contrasena) {
  await ctx.clearCookies();
  await p.goto(`${WEB}/entrar`);
  await p.getByLabel('Nombre de usuario').fill(usuario);
  await p.getByLabel('Contraseña', { exact: true }).fill(contrasena);
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForURL(`${WEB}/`);
}

/** Una fecha `AAAA-MM-DD` a `dias` de hoy en Bogotá. */
const enDias = (dias) =>
  new Date(Date.now() - 5 * 3_600_000 + dias * 86_400_000).toISOString().slice(0, 10);

/** Marca una fecha en el calendario de C14, pasando de mes si hace falta. */
async function marcar(fecha) {
  const [, mes, dia] = fecha.split('-').map(Number);
  const boton = p.getByRole('button', { name: `${dia} de ${MESES[mes - 1]}`, exact: true });
  for (let i = 0; i < 3 && !(await boton.count()); i++) {
    await p.getByRole('button', { name: 'Mes siguiente' }).click();
  }
  await boton.click();
}

/** El radio de Segmentado es sr-only: se toca su etiqueta, como lo haría una persona. */
const pestana = async (texto) =>
  await p.getByRole('radiogroup', { name: 'Qué ver de la jornada' }).getByText(texto).click();

const gestion = async (pestana = 'proximas') =>
  await api('GET', `/api/turnos/gestion/jornadas?pestana=${pestana}`, await cookie());

let armar = null;

await paso('el Operador llega a C14 desde «Más»', async () => {
  await entrar('operador1', CONTRASENA);
  await p.goto(`${WEB}/mas`);
  await p.getByRole('link', { name: /Turnos/ }).click();
  await p.getByRole('heading', { level: 1, name: 'Turnos' }).waitFor();
  await p.getByRole('button', { name: /Armar mercados \(demo\)/ }).waitFor();
  armar = (await gestion()).find((j) => j.titulo === 'Armar mercados (demo)');
  if (!armar) throw new Error('operador1 no gestiona «Armar mercados (demo)»');
  await revisar(p, 'C14 lista', 'C14-turnos/construida.png');
});

await paso('crea una serie de dos fechas con un solo formulario', async () => {
  await p.getByRole('button', { name: /Nueva jornada/ }).click();
  await p.getByRole('heading', { level: 1, name: 'Nueva jornada' }).waitFor();
  await p.getByLabel('Título').fill(TITULO);
  await p.getByLabel('Labor').fill('Clasificar ropa y empacar kits para las familias de la demo.');
  await marcar(enDias(3));
  await marcar(enDias(2));
  await p.getByLabel('Empieza').fill('09:00');
  await p.getByLabel('Termina').fill('12:00');
  await p.getByLabel('Cupos por jornada').fill('5');
  await revisar(p, 'C14 formulario', 'C14-turnos/construida-formulario.png');
  await p.getByRole('button', { name: 'Crear 2 jornadas' }).click();
  await p.getByRole('heading', { level: 1, name: 'Turnos' }).waitFor();
  const nuevas = (await gestion()).filter((j) => j.titulo === TITULO);
  if (nuevas.length !== 2) throw new Error(`${nuevas.length} jornadas creadas en la API`);
  if (nuevas[0].serieId === null || nuevas[0].serieId !== nuevas[1].serieId) {
    throw new Error('no comparten serie');
  }
});

await paso('ve los inscritos de «Armar mercados (demo)»', async () => {
  await p.getByRole('button', { name: /Armar mercados \(demo\)/ }).click();
  await p.getByRole('heading', { level: 1, name: 'Armar mercados (demo)' }).waitFor();
  const filas = p.getByRole('listitem').filter({ has: p.getByRole('button', { name: 'Asistió' }) });
  await filas.first().waitFor();
  if ((await filas.count()) !== armar.ocupados) {
    throw new Error(`${await filas.count()} inscritos, la API dice ${armar.ocupados}`);
  }
  await revisar(p, 'C14 detalle', 'C14-turnos/construida-detalle.png');
});

await paso('ajusta un cupo por alguien que llegó sin reserva', async () => {
  await p.getByRole('button', { name: 'Sumar una persona sin reserva' }).click();
  await p.getByRole('button', { name: 'Guardar ajuste' }).click();
  await p.getByRole('button', { name: 'Guardar ajuste' }).waitFor({ state: 'detached' });
  const ahora = (await gestion()).find((j) => j.id === armar.id);
  if (ahora.ajuste !== armar.ajuste + 1) throw new Error(`ajuste ${ahora.ajuste}`);
  if (!ahora.ajusteActualizadoEn) throw new Error('sin hora del ajuste');
});

await paso('cierra las reservas y las reabre', async () => {
  await pestana('Acciones');
  await revisar(p, 'C14 acciones', 'C14-turnos/construida-acciones.png');
  await p.getByRole('button', { name: /Cerrar las reservas/ }).click();
  await p.getByRole('button', { name: /Reabrir las reservas/ }).waitFor();
  const cerrada = (await gestion()).find((j) => j.id === armar.id);
  if (cerrada.estado !== 'CERRADA') throw new Error(`estado ${cerrada.estado}`);
  const publica = await (await fetch(`${WEB}/api/turnos/jornadas/${armar.id}`)).json();
  if (publica.aceptaReservas) throw new Error('el portal sigue aceptando reservas');
  await p.getByRole('button', { name: /Reabrir las reservas/ }).click();
  await p.getByRole('button', { name: /Cerrar las reservas/ }).waitFor();
  const abierta = (await gestion()).find((j) => j.id === armar.id);
  if (abierta.estado !== 'ABIERTA') throw new Error(`estado ${abierta.estado}`);
});

await paso('devuelve el ajuste y borra la serie del recorrido', async () => {
  await pestana(/^Inscritos/);
  await p.getByRole('button', { name: 'Quitar una persona sin reserva' }).click();
  await p.getByRole('button', { name: 'Guardar ajuste' }).click();
  await p.getByRole('button', { name: 'Guardar ajuste' }).waitFor({ state: 'detached' });
  await p.getByRole('button', { name: 'Turnos' }).click();
  const filas = p.getByRole('button', { name: new RegExp(TITULO) });
  for (let quedan = 2; quedan > 0; quedan--) {
    // Al volver, la lista se refresca: se espera a que la fila borrada ya no esté
    await p.waitForFunction(
      ([t, n]) =>
        [...document.querySelectorAll('button')].filter((b) => b.textContent.includes(t)).length ===
        n,
      [TITULO, quedan],
    );
    await filas.first().click();
    await pestana('Acciones');
    await p.getByRole('button', { name: /Borrar la jornada/ }).click();
    await p.getByRole('dialog').getByRole('button', { name: 'Borrar jornada' }).click();
    await p.getByRole('heading', { level: 1, name: 'Turnos' }).waitFor();
  }
  let quedan = -1;
  for (let i = 0; i < 10 && quedan !== 0; i++) {
    if (i) await p.waitForTimeout(500);
    quedan = (await gestion()).filter((j) => j.titulo === TITULO).length;
  }
  const final = (await gestion()).find((j) => j.id === armar.id);
  if (quedan) throw new Error(`quedan ${quedan} jornadas del recorrido`);
  if (final.ajuste !== armar.ajuste) throw new Error(`ajuste ${final.ajuste}, era ${armar.ajuste}`);
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
