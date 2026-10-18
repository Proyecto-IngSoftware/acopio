// Recorrido del cierre del ciclo 2 del Bloque 4: remisiones para el Operador, a 360 × 640,
// contra la API del Compose con el seed:demo. Sigue los pasos 4 y 6 del §1 de la
// especificación: un borrador aprobado en el motor, la fila de «Más», editar la línea,
// despachar con responsable y folio, imprimir el documento, cancelar lo despachado y un
// despacho general.
//
// Necesita el Compose con la API reconstruida, seed y seed:demo corridos, y el build servido:
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/consola-remisiones.mjs
// Escribe las capturas en docs/03-diseno/stitch/ salvo con CAPTURAS=no.
// Con CAPTURAS_WORD=<carpeta> guarda además cada captura del alto de la pantalla, para el Word. Sale con 1 si falla un paso.
// window y document se usan dentro de page.evaluate, que corre en el navegador
/* global window, document */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Debe coincidir con APP_URL: la API rechaza escrituras con cookie desde otro origen
const WEB = process.env.WEB ?? 'http://localhost:5173';
const ADMIN = process.env.ADMIN_CONTRASENA ?? 'cambiar-antes-de-usar';
const DEMO = process.env.DEMO_CONTRASENA ?? 'demo-acopio-2026';
const DISENO = fileURLToPath(new URL('../../../docs/03-diseno/stitch/', import.meta.url));
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const KENNEDY = 'd0000000-0000-4000-8000-000000000012';

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

/** Llamada a la API por el proxy de la web, con la cookie de sesión del navegador. */
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
/** Saldo de cada categoría de Kennedy, del excedente. */
async function saldos() {
  const filas = await api('GET', `/api/acopios/${KENNEDY}/excedentes`, await cookie());
  return new Map(filas.map((f) => [f.categoriaId, f.saldo]));
}

await paso('el Administrador deja un borrador de Kennedy desde el motor', async () => {
  await entrar('admin', ADMIN);
  const c = await cookie();
  const hay = await api('GET', '/api/remisiones?estado=BORRADOR', c);
  if (hay.some((r) => r.acopio.id === KENNEDY)) return;
  await api('POST', '/api/sugerencias/recalcular', c);
  const propuestas = await api('GET', `/api/sugerencias?estado=PROPUESTA&acopio=${KENNEDY}`, c);
  const s = propuestas[0];
  if (!s) throw new Error('Kennedy no tiene sugerencias ni borradores');
  await api('POST', `/api/sugerencias/${s.id}/aprobar`, c, { cantidad: s.cantidad });
});

let codigo = '';
await paso('el Operador de Kennedy ve en «Más» los borradores por despachar', async () => {
  await entrar('operador2', DEMO);
  await p.goto(`${WEB}/mas`);
  const fila = p
    .getByRole('region', { name: 'Mi acopio' })
    .getByRole('link', { name: /\d+ en borrador por despachar/ });
  await fila.waitFor();
  await fila.click();
  await p.waitForURL(`${WEB}/consola/remisiones`);
  const primera = p.getByRole('link', { name: /R-\d{4}-/ }).first();
  await primera.waitFor();
  await revisar(p, 'lista', 'C12-remisiones/construida-lista.png');
  codigo = /R-\d{4}-[A-Z0-9]{5}/.exec((await primera.textContent()) ?? '')?.[0] ?? '';
  if (!codigo) throw new Error('la fila no tiene código');
});

let lineas = [];
await paso('cambia la cantidad de una línea y la guarda', async () => {
  // El editor lista todas las categorías con excedente en orden alfabético, con 0 las que no
  // van en la remisión: la línea se busca por su categoría, no por la posición
  const antes = await api('GET', `/api/remisiones/${codigo}`, await cookie());
  const linea = antes.lineas.find((l) => l.cantidadPlaneada > 1);
  if (!linea) throw new Error(`${codigo} no tiene una línea con más de 1`);
  await p.goto(`${WEB}/consola/remisiones/${codigo}`);
  const campo = p.getByLabel(`Cantidad de ${linea.categoria} (`);
  await campo.waitFor();
  const actual = Number(await campo.inputValue());
  if (actual !== linea.cantidadPlaneada) {
    throw new Error(
      `el campo de ${linea.categoria} tiene ${actual}, la API ${linea.cantidadPlaneada}`,
    );
  }
  await campo.fill(String(actual - 1));
  await p.getByRole('button', { name: 'Guardar líneas' }).click();
  await p.getByText('Líneas guardadas').waitFor();
  const r = await api('GET', `/api/remisiones/${codigo}`, await cookie());
  if (!r.lineas.some((l) => Math.abs(l.cantidadPlaneada - (actual - 1)) < 0.001)) {
    throw new Error(`la API no tiene la línea con ${actual - 1}`);
  }
  lineas = r.lineas;
  await revisar(p, 'borrador', 'C12-remisiones/construida-borrador.png');
});

await paso('despacha con responsable y folio, y el saldo baja lo despachado', async () => {
  const antes = await saldos();
  await p.getByRole('button', { name: 'Despachar' }).click();
  const hoja = p.getByRole('dialog', { name: `Despachar ${codigo}` });
  const responsable = hoja.getByLabel('Quién lleva el envío');
  if (await responsable.count()) await responsable.fill('Conductor de prueba');
  const casillas = hoja.getByRole('checkbox');
  await hoja
    .getByText(/No hay folios conciliados|ACO-/)
    .first()
    .waitFor();
  if (await casillas.count()) await casillas.first().check();
  await revisar(p, 'despachar', 'C12-remisiones/construida-despachar.png');
  await hoja.getByRole('button', { name: 'Despachar' }).click();
  await p.getByText(`${codigo} va en camino`).waitFor();
  const r = await api('GET', `/api/remisiones/${codigo}`, await cookie());
  if (r.estado !== 'EN_TRANSITO') throw new Error(`quedó en ${r.estado}`);
  const despues = await saldos();
  for (const l of lineas) {
    const bajo = (antes.get(l.categoriaId) ?? 0) - (despues.get(l.categoriaId) ?? 0);
    if (Math.abs(bajo - l.cantidadPlaneada) > 0.001) {
      throw new Error(`${l.categoria} bajó ${bajo}, se despacharon ${l.cantidadPlaneada}`);
    }
  }
});

await paso('el documento muestra el código y el QR', async () => {
  await p.getByRole('link', { name: 'Imprimir documento' }).click();
  await p.waitForURL(`${WEB}/consola/remisiones/${codigo}/documento`);
  await p.getByRole('heading', { level: 1, name: `Remisión ${codigo}` }).waitFor();
  await p.getByRole('img', { name: `Código QR para recibir la remisión ${codigo}` }).waitFor();
  await revisar(p, 'documento', 'C12-remisiones/construida-documento.png');
});

// El despacho sacó inventario de Kennedy: cancelarlo lo devuelve con un ajuste (M-07) y deja
// la demo lista para la corrida siguiente y para consola-motor.mjs
await paso('cancela la despachada y el saldo vuelve', async () => {
  const antes = await saldos();
  await p.goto(`${WEB}/consola/remisiones/${codigo}`);
  await p.getByRole('button', { name: 'Cancelar remisión' }).click();
  const hoja = p.getByRole('dialog', { name: `Cancelar ${codigo}` });
  await hoja.getByText('Lo despachado vuelve al inventario del acopio con un ajuste.').waitFor();
  await hoja.getByLabel('Motivo').fill('La vía a Mocoa está cerrada');
  await hoja.getByRole('button', { name: 'Cancelar remisión' }).click();
  await p.getByText(`Se canceló ${codigo}`).waitFor();
  const despues = await saldos();
  for (const l of lineas) {
    const subio = (despues.get(l.categoriaId) ?? 0) - (antes.get(l.categoriaId) ?? 0);
    if (Math.abs(subio - l.cantidadPlaneada) > 0.001) {
      throw new Error(`${l.categoria} subió ${subio}, se habían despachado ${l.cantidadPlaneada}`);
    }
  }
});

await paso('crea un despacho general a mano y lo cancela', async () => {
  await p.goto(`${WEB}/consola/remisiones/nueva`);
  await p
    .getByLabel(/^Cantidad de /)
    .first()
    .fill('1');
  await p.getByRole('button', { name: 'Crear borrador' }).click();
  await p.waitForURL(/\/consola\/remisiones\/R-\d{4}-\w+$/);
  const nueva = /R-\d{4}-\w+$/.exec(p.url())?.[0];
  await p.getByText(`Se creó la remisión ${nueva}`).waitFor();
  await p.getByRole('button', { name: 'Cancelar remisión' }).click();
  const hoja = p.getByRole('dialog', { name: `Cancelar ${nueva}` });
  await hoja.getByLabel('Motivo').fill('Prueba del recorrido de remisiones');
  await hoja.getByRole('button', { name: 'Cancelar remisión' }).click();
  await p.getByText(`Se canceló ${nueva}`).waitFor();
  const r = await api('GET', `/api/remisiones/${nueva}`, await cookie());
  if (r.estado !== 'CANCELADA' || r.zona !== null) {
    throw new Error(`quedó en ${r.estado} con zona ${r.zona?.nombre}`);
  }
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
