// Recorrido de la fase de presentaciones y códigos de barras, de punta a punta, a 360 × 640,
// contra la API del Compose. Un Donador escanea un EAN que Acopio no conoce, propone una
// presentación nueva y prepara una donación con ella; operador1 recibe el folio y confirma el
// código con «Es correcto»; el Administrador lo ve validado en C18 (Catálogo, códigos de barras)
// y, al escanearlo ahí, Acopio lo reconoce y abre su presentación.
//
// La cámara es la falsa de Chromium. Como lee un video de prueba y no un código, el script
// dibuja un EAN-13 con sharp, lo convierte en un archivo MJPEG y se lo da a Chromium con
// --use-file-for-fake-video-capture. Así @zxing/browser decodifica el mismo número que se
// comprueba al final.
//
// Necesita el Compose con la API reconstruida, seed y seed:demo corridos, y el build servido:
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/presentaciones.mjs
// ADMIN_CONTRASENA lleva la del administrador del seed y DEMO_CONTRASENA la de las cuentas de la
// demo. Cada corrida inventa un EAN y una presentación nuevos, así que se puede repetir. No
// escribe capturas. Sale con 1 si falla un paso.
// window y document se usan dentro de page.evaluate, que corre en el navegador
/* global window, document */
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

// Debe coincidir con APP_URL: la API rechaza escrituras con cookie desde otro origen
const WEB = process.env.WEB ?? 'http://localhost:5173';
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const CHAPINERO = 'd0000000-0000-4000-8000-000000000011';
const CONTRASENA_DEMO = process.env.DEMO_CONTRASENA ?? 'demo-acopio-2026';
const ADMIN = process.env.ADMIN_CONTRASENA ?? 'cambiar-antes-de-usar';
const sharp = createRequire(new URL('../../api/package.json', import.meta.url))('sharp');

// --- Un EAN-13 que no existe en la base, con su dígito de control ---
const cuerpo12 = `200${String(Date.now()).slice(-9)}`;
const control =
  (10 - ([...cuerpo12].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0) % 10)) % 10;
const EAN = `${cuerpo12}${control}`;
const PRESENTACION = `Bulto recorrido ${String(Date.now()).slice(-6)}`;

const L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const R = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];
const PARIDAD = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

function modulosEan13(ean) {
  const p = PARIDAD[Number(ean[0])];
  let m = '101';
  for (let i = 0; i < 6; i++) m += (p[i] === 'L' ? L : G)[Number(ean[i + 1])];
  m += '01010';
  for (let i = 7; i < 13; i++) m += R[Number(ean[i])];
  return `${m}101`;
}

/** Video MJPEG de 2 s con el código centrado, como lo lee la cámara falsa de Chromium. */
async function videoConCodigo(ean) {
  const ancho = 1280;
  const alto = 720;
  const modulo = 6;
  const m = modulosEan13(ean);
  const x0 = Math.round((ancho - m.length * modulo) / 2);
  const barras = [...m]
    .map((b, i) =>
      b === '1'
        ? `<rect x="${x0 + i * modulo}" y="200" width="${modulo}" height="320" fill="#000"/>`
        : '',
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}"><rect width="100%" height="100%" fill="#fff"/>${barras}</svg>`;
  const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
  const archivo = join(mkdtempSync(join(tmpdir(), 'ean-')), 'codigo.mjpeg');
  writeFileSync(archivo, Buffer.concat(Array.from({ length: 30 }, () => jpeg)));
  return archivo;
}

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
    // Cada paso parte del anterior: seguir solo llenaría de ruido
    await cerrar();
  }
}

async function revisar(p, nombre) {
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
}

/** Llamada a la API por el proxy de la web, con la cookie de sesión si la hay. */
async function api(metodo, ruta, cuerpoJson, cookie) {
  const r = await fetch(`${WEB}${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', origin: WEB, ...(cookie ? { cookie } : {}) },
    body: cuerpoJson ? JSON.stringify(cuerpoJson) : undefined,
  });
  if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status} ${await r.text()}`);
  const texto = await r.text();
  return {
    cuerpo: texto ? JSON.parse(texto) : null,
    cookie: r.headers.get('set-cookie')?.split(';')[0],
  };
}

async function entrar(p, usuario, contrasena) {
  await p.goto(`${WEB}/entrar`);
  await p.getByLabel('Correo o nombre de usuario').fill(usuario);
  await p.getByLabel('Contraseña', { exact: true }).fill(contrasena);
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForURL((u) => !u.pathname.startsWith('/entrar'));
}

const video = await videoConCodigo(EAN);
console.log(`EAN de la corrida: ${EAN}, presentación: ${PRESENTACION}`);
const b = await chromium.launch({
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    `--use-file-for-fake-video-capture=${video}`,
  ],
});
const nuevo = () =>
  b.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 2,
    permissions: ['camera'],
  });
const don = await (await nuevo()).newPage();
const op = await (await nuevo()).newPage();
const adm = await (await nuevo()).newPage();
for (const p of [don, op, adm]) p.on('pageerror', (e) => errores.push(e.message));
cerrar = async () => {
  await b.close();
  console.log(`\nErrores de la página: ${errores.length}`);
  for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
  console.log(`Resultado: ${bien} bien, ${mal} mal`);
  process.exit(1);
};

// Una sola entrada del Administrador por la API: la API limita los intentos de entrada por
// minuto, y esa cookie sirve también para la pantalla de C18
let cookieAdmin = '';
await paso('el EAN no existe todavía', async () => {
  ({ cookie: cookieAdmin } = await api('POST', '/api/auth/sesion', {
    usuario: 'admin',
    contrasena: ADMIN,
  }));
  const r = await fetch(`${WEB}/api/codigos-barras/${EAN}`, { headers: { cookie: cookieAdmin } });
  if (r.status !== 404) throw new Error(`el EAN ya existe (${r.status})`);
});

await paso('el Donador entra y escanea un código desconocido', async () => {
  await entrar(don, 'donador1@demo.acopio.local', CONTRASENA_DEMO);
  await don.goto(`${WEB}/donar`);
  await don.getByRole('heading', { name: 'Preparar donación' }).waitFor();
  await don.getByRole('button', { name: 'Escanear' }).click();
  // La cámara falsa lee el EAN dibujado y la API no lo conoce: se ofrece proponerlo
  await don.getByRole('dialog', { name: 'Código nuevo' }).waitFor({ timeout: 20_000 });
  const leido = await don.getByRole('dialog', { name: 'Código nuevo' }).textContent();
  if (!leido?.includes(EAN)) throw new Error(`la cámara leyó otro número: ${leido}`);
  await revisar(don, 'Código nuevo (Donador)');
});

await paso('propone el código con una presentación nueva', async () => {
  const hoja = don.getByRole('dialog', { name: 'Código nuevo' });
  await hoja.getByRole('searchbox', { name: 'Categoría' }).fill('arroz');
  await hoja
    .getByRole('button', { name: /^Arroz/ })
    .first()
    .click();
  await hoja.getByRole('button', { name: 'Nueva presentación' }).click();
  const nueva = don.getByRole('dialog', { name: 'Nueva presentación' });
  await nueva.getByLabel('Nombre').fill(PRESENTACION);
  await nueva.getByLabel('Tamaño').fill(`1.${(Date.now() % 900) + 100}`);
  await revisar(don, 'Nueva presentación');
  await nueva.getByRole('button', { name: 'Crear presentación' }).click();
  await hoja.getByRole('radio', { name: PRESENTACION }).waitFor();
  await hoja.getByRole('button', { name: 'Asociar y seguir' }).click();
  await don.getByRole('list', { name: 'Lo que llevas' }).waitFor();
  const linea = don.getByRole('listitem', { name: /Arroz/ });
  await linea.getByText(EAN).waitFor();
  await linea.getByText('Sin confirmar').waitFor();
});

let folio = '';
await paso('prepara la donación para Acopio Chapinero y lee el folio', async () => {
  await don.getByRole('button', { name: 'Siguiente: dónde entregar' }).click();
  await don.getByRole('heading', { name: '¿Dónde la entregas?' }).waitFor();
  await don.getByRole('radio', { name: /Chapinero/ }).check();
  await don.getByRole('button', { name: 'Preparar y ver mi folio' }).click();
  await don.getByRole('heading', { name: 'Tu donación está preparada' }).waitFor();
  folio =
    (await don
      .getByText(/^[A-Z]{2,4}-\d{4}-[A-Z0-9]{5}$/)
      .first()
      .textContent()) ?? '';
  if (!folio) throw new Error('no se leyó el folio');
});

await paso('por la API el código quedó PROPUESTO con la presentación nueva', async () => {
  const { cuerpo } = await api('GET', `/api/codigos-barras/${EAN}`, undefined, cookieAdmin);
  if (cuerpo.estado !== 'PROPUESTO') throw new Error(`estado ${cuerpo.estado}`);
  if (cuerpo.presentacion?.nombre !== PRESENTACION) {
    throw new Error(`presentación ${cuerpo.presentacion?.nombre}`);
  }
});

await paso('operador1 busca el folio y ve el código propuesto', async () => {
  await entrar(op, 'operador1', CONTRASENA_DEMO);
  await op.goto(`${WEB}/consola/acopios/${CHAPINERO}/recibir`);
  await op.getByRole('textbox', { name: 'Folio' }).fill(folio);
  await op.getByRole('button', { name: 'Buscar' }).click();
  await op.getByRole('heading', { name: 'Lo que trae' }).waitFor();
  await op.getByText('Código propuesto').waitFor();
  await revisar(op, 'recibir, código propuesto');
});

await paso('confirma el código con «Es correcto» y registra la recepción', async () => {
  await op.getByRole('button', { name: 'Es correcto' }).click();
  await op.getByText('Validado').waitFor();
  for (const fecha of await op.locator('input[type=date]').all()) await fecha.fill('2027-01-31');
  await op.getByRole('button', { name: /Registrar recepción/ }).click();
  await op.getByRole('heading', { name: 'Recibido' }).waitFor();
});

await paso('por la API el código está VALIDADO y la línea, recibida', async () => {
  const { cuerpo: c } = await api('GET', `/api/codigos-barras/${EAN}`, undefined, cookieAdmin);
  if (c.estado !== 'VALIDADO') throw new Error(`estado ${c.estado}`);
  const { cuerpo: comprobante } = await api(
    'GET',
    `/api/comprobantes/${folio}`,
    undefined,
    cookieAdmin,
  );
  const linea = comprobante.lineas.find((l) => l.ean === EAN);
  if (!linea) throw new Error('la línea perdió el EAN');
  if (!(linea.cantidadConfirmada > 0)) throw new Error(`confirmada ${linea.cantidadConfirmada}`);
});

await paso('el Administrador ve el código validado en C18', async () => {
  const [nombre, valor] = cookieAdmin.split('=');
  await adm.context().addCookies([{ name: nombre, value: valor, url: `${WEB}/api` }]);
  await adm.goto(`${WEB}/consola/catalogo`);
  await adm.getByRole('tab', { name: /Códigos de barras/ }).click();
  await adm.getByRole('searchbox', { name: 'Buscar códigos' }).fill(EAN);
  await adm.getByText('Todos', { exact: true }).click();
  // Los códigos se agrupan por presentación: se abre la que se creó en esta corrida
  await adm.getByRole('button', { name: new RegExp(PRESENTACION) }).click();
  const ficha = adm.getByRole('article', { name: EAN });
  await ficha.waitFor();
  const texto = (await ficha.textContent()) ?? '';
  if (!texto.includes('Validado')) throw new Error(`la ficha dice: ${texto.slice(0, 120)}`);
  await revisar(adm, 'C18');
});

await paso(
  'el Administrador escanea en C18 el código que ya existe y abre su presentación',
  async () => {
    await adm.goto(`${WEB}/consola/catalogo?pestana=codigos`);
    await adm.getByRole('button', { name: 'Escanear' }).click();
    // La cámara falsa lee el mismo EAN, que ya está validado: no se ofrece «Código nuevo»
    await adm
      .getByText(`Ese código ya está en Arroz · ${PRESENTACION}.`)
      .waitFor({ timeout: 20_000 });
    await adm.getByRole('heading', { level: 2, name: PRESENTACION }).waitFor();
    await adm.getByRole('article', { name: EAN }).waitFor();
    await revisar(adm, 'C18, código escaneado que ya existe');
  },
);

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
