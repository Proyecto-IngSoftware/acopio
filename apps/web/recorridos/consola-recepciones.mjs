// Recorrido del cierre del ciclo 3 del Bloque 4: recepción y reportes del Receptor, a
// 360 × 640, contra la API del Compose con el seed:demo. El Operador de Kennedy despacha una
// remisión nueva hacia la zona de la demo, así las de la demo (R-2026-DEMA2 y DEMA3) quedan
// para la ronda de pruebas. La Receptora la ve en «Más», la abre, sube una foto, confirma, y
// después reporta y resuelve una categoría en C20.
//
// Necesita el Compose con seed y seed:demo corridos, y el build servido:
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/consola-recepciones.mjs
// Escribe las capturas en docs/03-diseno/stitch/ salvo con CAPTURAS=no. Sale con 1 si falla un paso.
// window y document se usan dentro de page.evaluate, que corre en el navegador
/* global window, document */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WEB = process.env.WEB ?? 'http://localhost:5173';
const DEMO = process.env.DEMO_CONTRASENA ?? 'demo-acopio-2026';
const DISENO = fileURLToPath(new URL('../../../docs/03-diseno/stitch/', import.meta.url));
const FOTO = fileURLToPath(
  new URL('../../../docs/03-diseno/stitch/C13-recepcion/captura-recibir.png', import.meta.url),
);
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const KENNEDY = 'd0000000-0000-4000-8000-000000000012';
const ZONA = 'd0000000-0000-4000-8000-000000000031';

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

/** Sesión del Operador solo por la API: el login admite 5 intentos por minuto, así cada
 *  corrida usa dos (el Operador y la Receptora) y se puede repetir enseguida. */
async function sesionApi(usuario, contrasena) {
  const r = await fetch(`${WEB}/api/auth/sesion`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: WEB },
    body: JSON.stringify({ usuario, contrasena }),
  });
  if (!r.ok) throw new Error(`login de ${usuario} → ${r.status}`);
  const c = /acopio_sesion=[^;]+/.exec(r.headers.get('set-cookie') ?? '')?.[0];
  if (!c) throw new Error(`login de ${usuario} sin cookie`);
  return c;
}

let codigo = '';
let operador = '';
await paso('el Operador de Kennedy despacha una remisión hacia la zona de la demo', async () => {
  operador = await sesionApi('operador2', DEMO);
  const c = operador;
  const excedente = await api('GET', `/api/acopios/${KENNEDY}/excedentes`, c);
  // Siempre 1 L de agua, que sobra en Kennedy: no toca lo que usan consola-remisiones y el motor
  const linea = excedente.find((e) => e.categoria === 'Agua potable' && e.movible >= 1);
  if (!linea) throw new Error('Kennedy no tiene agua para mandar');
  const r = await api('POST', '/api/remisiones', c, {
    acopioId: KENNEDY,
    zonaId: ZONA,
    responsable: 'Conductor del recorrido',
    lineas: [{ categoriaId: linea.categoriaId, cantidad: 1 }],
  });
  await api('POST', `/api/remisiones/${r.codigo}/despachar`, c, { folios: [] });
  codigo = r.codigo;
});

await paso('la Receptora ve en «Más» lo que viene en camino y abre la lista', async () => {
  await entrar('receptor1', DEMO);
  await p.goto(`${WEB}/mas`);
  const fila = p
    .getByRole('region', { name: 'Mi zona' })
    .getByRole('link', { name: /remisi(ón|ones) en camino/ });
  await fila.waitFor();
  await revisar(p, 'más', 'C13-recepcion/construida-mas.png');
  await fila.click();
  await p.waitForURL(`${WEB}/consola/recepciones`);
  await p.getByRole('link', { name: new RegExp(codigo) }).waitFor();
  await revisar(p, 'lista', 'C13-recepcion/construida-lista.png');
});

await paso('sin foto no deja confirmar; con una foto, sí', async () => {
  await p.getByRole('link', { name: new RegExp(codigo) }).click();
  await p.waitForURL(`${WEB}/consola/recepciones/${codigo}`);
  const confirmar = p.getByRole('button', { name: /Confirmar recepción/ });
  await confirmar.waitFor();
  if (await confirmar.isEnabled()) throw new Error('confirmar está habilitado sin foto');
  await p.getByLabel('Tomar foto').setInputFiles(FOTO);
  await p.getByRole('img', { name: 'Foto 1 de lo que llegó' }).waitFor();
  const cargada = await p
    .getByRole('img', { name: 'Foto 1 de lo que llegó' })
    .evaluate((img) => img.complete && img.naturalWidth > 0);
  if (!cargada) throw new Error('la miniatura no cargó');
  if (!(await confirmar.isEnabled())) throw new Error('confirmar sigue deshabilitado');
  await p.getByLabel('Nota (opcional)').fill('Llegó completo');
  await revisar(p, 'recibir', 'C13-recepcion/construida-recibir.png');
});

await paso('confirma y la remisión queda recibida en la zona', async () => {
  await p.getByRole('button', { name: /Confirmar recepción/ }).click();
  await p.getByRole('heading', { name: `${codigo} recibida` }).waitFor();
  await revisar(p, 'recibida', 'C13-recepcion/construida-recibida.png');
  const r = await api('GET', `/api/remisiones/${codigo}`, operador);
  if (r.estado !== 'RECIBIDA' || r.notaRecepcion !== 'Llegó completo' || r.evidencias !== 1) {
    throw new Error(`quedó ${r.estado}, nota ${r.notaRecepcion}, ${r.evidencias} fotos`);
  }
});

let reportada = '';
await paso('desde la ficha reporta una categoría con nota pública', async () => {
  await p.goto(`${WEB}/consola/zonas/${ZONA}`);
  await p.getByRole('link', { name: /Reportar necesidad/ }).click();
  await p.waitForURL(`${WEB}/consola/zonas/${ZONA}/reportar`);
  const grupo = p.getByRole('group', { name: 'Categorías' });
  await grupo.waitFor();
  // Una que la demo no reporta: agua y arroz ya tienen reportes del seed
  const casillas = grupo.getByRole('checkbox');
  const n = await casillas.count();
  for (let i = 0; i < n; i++) {
    const nombre = await casillas.nth(i).getAttribute('aria-label');
    if (nombre && !['Agua potable', 'Arroz'].includes(nombre)) {
      reportada = nombre;
      break;
    }
  }
  if (!reportada) throw new Error('la zona no tiene otra categoría');
  await grupo.getByRole('checkbox', { name: reportada }).check();
  await p.getByLabel('Nota pública (opcional)').fill('Prueba del recorrido');
  await revisar(p, 'reportar', 'C20-reportar/construida.png');
  await p.getByRole('button', { name: 'Reportar 1 categoría' }).click();
  await p.getByText('Reportaste 1 categoría.', { exact: false }).waitFor();
});

await paso('la marca resuelta y deja de estar pendiente', async () => {
  await p.getByRole('link', { name: /Reportar necesidad/ }).click();
  // El radio de Segmentado es sr-only: se toca su etiqueta, como lo haría una persona
  await p.getByText('Ya se resolvió', { exact: true }).click();
  const grupo = p.getByRole('group', { name: 'Categorías' });
  await grupo.getByRole('checkbox', { name: reportada }).check();
  await p.getByRole('button', { name: 'Marcar 1 como resuelta' }).click();
  await p.getByText('Marcaste 1 categoría como resuelta.').waitFor();
  const reportes = await api('GET', `/api/zonas/${ZONA}/reportes`, await cookie());
  const ultimo = reportes
    .filter((r) => r.categoria === reportada)
    .sort((a, b) => b.reportadoEn.localeCompare(a.reportadoEn))[0];
  if (!ultimo?.resuelta) throw new Error(`lo último de ${reportada} no está resuelto`);
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
