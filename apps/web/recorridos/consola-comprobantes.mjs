// Recorrido del cierre del ciclo 2 del Bloque 3: la consola de comprobantes de punta a punta,
// a 360 × 640, contra la API del Compose. Un Donador nuevo prepara dos donaciones por la API;
// operador1 las recibe en Acopio Chapinero (una con diferencia); auditor1 concilia la primera,
// rechaza la segunda con «Otro» y una nota, ve el correo en Mailpit y revierte el rechazo.
//
// Necesita el Compose con la API reconstruida, seed y seed:demo corridos, y el build servido:
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/consola-comprobantes.mjs
// Escribe las capturas en docs/03-diseno/stitch/ salvo con CAPTURAS=no. Sale con 1 si falla un paso.
// window y document se usan dentro de page.evaluate, que corre en el navegador
/* global window, document */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Debe coincidir con APP_URL: la API rechaza escrituras con cookie desde otro origen
const WEB = process.env.WEB ?? 'http://localhost:5173';
const MAILPIT = process.env.MAILPIT ?? 'http://localhost:8025';
const DISENO = fileURLToPath(new URL('../../../docs/03-diseno/stitch/', import.meta.url));
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const CHAPINERO = 'd0000000-0000-4000-8000-000000000011';
const CONTRASENA_DEMO = 'demo-acopio-2026';
const CORREO = `donador-consola-${Date.now()}@demo.acopio.local`;

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
}

/** Llamada a la API por el proxy de la web, con la cookie de sesión si la hay. */
async function api(metodo, ruta, cuerpo, cookie) {
  const r = await fetch(`${WEB}${ruta}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      origin: WEB,
      ...(cookie ? { cookie } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status} ${await r.text()}`);
  const texto = await r.text();
  return {
    cuerpo: texto ? JSON.parse(texto) : null,
    cookie: r.headers.get('set-cookie')?.split(';')[0],
  };
}

async function correosDe(correo) {
  const lista = await (
    await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${correo}`)}`)
  ).json();
  return lista.messages ?? [];
}

async function esperarCorreos(correo, cuantos) {
  // La cola de correo sale cada minuto
  for (let i = 0; i < 120; i++) {
    const mensajes = await correosDe(correo);
    if (mensajes.length >= cuantos) return mensajes;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`no llegaron ${cuantos} correos a ${correo}`);
}

async function categoria(q, nombre, cookie) {
  const { cuerpo } = await api('GET', `/api/categorias/buscar?q=${q}`, undefined, cookie);
  const hallada = cuerpo.find((c) => c.nombre === nombre);
  if (!hallada) throw new Error(`no está la categoría ${nombre}`);
  return hallada.id;
}

async function entrar(p, usuario) {
  await p.goto(`${WEB}/entrar`);
  await p.getByLabel('Nombre de usuario').fill(usuario);
  await p.getByLabel('Contraseña', { exact: true }).fill(CONTRASENA_DEMO);
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForURL(`${WEB}/`);
}

async function recibir(p, folio, { conDiferencia }) {
  await p.goto(`${WEB}/consola/acopios/${CHAPINERO}/recibir`);
  await p.getByRole('textbox', { name: 'Folio' }).fill(folio);
  await p.getByRole('button', { name: 'Buscar' }).click();
  await p.getByRole('heading', { name: 'Lo que trae' }).waitFor();
  for (const fecha of await p.locator('input[type=date]').all()) await fecha.fill('2027-01-31');
  if (conDiferencia) {
    await p.getByRole('button', { name: 'Menos Arroz' }).click();
    await p.getByLabel('¿Qué pasó con la diferencia?').fill('Un paquete roto');
  }
}

const b = await chromium.launch();
const ctxOperador = await b.newContext({
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 2,
});
const ctxAuditor = await b.newContext({
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 2,
});
const op = await ctxOperador.newPage();
const aud = await ctxAuditor.newPage();
for (const p of [op, aud]) p.on('pageerror', (e) => errores.push(e.message));
cerrar = async () => {
  await b.close();
  console.log(`\nErrores de la página: ${errores.length}`);
  for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
  console.log(`Resultado: ${bien} bien, ${mal} mal`);
  process.exit(1);
};

let donador = '';
const folios = [];
await paso('un Donador nuevo prepara dos donaciones para Acopio Chapinero', async () => {
  await api('POST', '/api/auth/registro', { nombre: 'Camila Consola', correo: CORREO });
  const [mensaje] = await esperarCorreos(CORREO, 1);
  const m = await (await fetch(`${MAILPIT}/api/v1/message/${mensaje.ID}`)).json();
  const token = /\/donador\/confirmar\/([\w-]+)/.exec(`${m.Text}\n${m.HTML}`)?.[1];
  if (!token) throw new Error('no se leyó el enlace de confirmación');
  ({ cookie: donador } = await api('POST', '/api/auth/registro/confirmar', {
    token,
    contrasena: 'recorrido-consola-2026',
  }));
  const arroz = await categoria('arroz', 'Arroz', donador);
  const agua = await categoria('agua', 'Agua potable', donador);
  for (const lineas of [
    [
      { categoriaId: arroz, cantidad: 5 },
      { categoriaId: agua, cantidad: 12 },
    ],
    [{ categoriaId: arroz, cantidad: 2 }],
  ]) {
    const { cuerpo } = await api(
      'POST',
      '/api/donaciones',
      { acopioId: CHAPINERO, lineas },
      donador,
    );
    folios.push(cuerpo.folio);
  }
});

await paso('operador1 abre «Recibir por folio» desde C4', async () => {
  await entrar(op, 'operador1');
  await op.goto(`${WEB}/consola/acopios/${CHAPINERO}/entrada`);
  await op.getByRole('link', { name: /Recibir por folio/ }).click();
  await op.getByRole('textbox', { name: 'Folio' }).waitFor();
  await revisar(op, 'recibir, buscar', 'C04-recibir-folio/construida-buscar.png');
});

await paso('recibe el primero con una línea de menos y su motivo', async () => {
  await recibir(op, folios[0], { conDiferencia: true });
  await revisar(op, 'recibir, confirmar', 'C04-recibir-folio/construida.png');
  await op.getByRole('button', { name: /Registrar recepción/ }).click();
  await op.getByRole('heading', { name: 'Recibido' }).waitFor();
  await revisar(op, 'recibir, hecho', 'C04-recibir-folio/construida-hecho.png');
});

await paso('recibe el segundo completo', async () => {
  await recibir(op, folios[1], { conDiferencia: false });
  await op.getByRole('button', { name: /Registrar recepción/ }).click();
  await op.getByRole('heading', { name: 'Recibido' }).waitFor();
});

await paso('auditor1 ve el primero en C8 con «Con diferencia»', async () => {
  await entrar(aud, 'auditor1');
  await aud.goto(`${WEB}/mas`);
  await aud.getByRole('link', { name: /Comprobantes/ }).click();
  const fila = aud.getByRole('link', { name: new RegExp(folios[0]) });
  await fila.waitFor();
  if (!(await fila.textContent())?.includes('Con diferencia')) {
    throw new Error('la fila no marca la diferencia');
  }
  await revisar(aud, 'C8', 'C08-comprobantes/construida.png');
});

await paso('abre la conciliación y concilia', async () => {
  await aud.getByRole('link', { name: new RegExp(folios[0]) }).click();
  await aud.getByRole('table', { name: 'Por categoría' }).waitFor();
  await aud.getByText('Un paquete roto').waitFor();
  await revisar(aud, 'conciliación', 'C08-conciliacion/construida.png');
  await aud.getByRole('button', { name: 'Conciliar' }).click();
  await aud.getByText(/Conciliada el/).waitFor();
});

await paso('rechaza el segundo con «Otro» y una nota', async () => {
  await aud.goto(`${WEB}/consola/comprobantes/${folios[1]}`);
  await aud.getByRole('button', { name: 'Rechazar' }).click();
  const hoja = aud.getByRole('dialog', { name: `Rechazar ${folios[1]}` });
  await hoja.getByRole('radio', { name: 'Otro' }).check();
  await hoja.getByRole('textbox', { name: /Nota/ }).fill('No coincide con la planilla del día');
  await revisar(aud, 'hoja de rechazo', 'C08-conciliacion/construida-rechazo.png');
  await hoja.getByRole('button', { name: 'Rechazar comprobante' }).click();
  await aud.getByRole('button', { name: 'Revertir rechazo' }).waitFor();
});

await paso('el Donador recibe el correo del rechazo', async () => {
  await esperarCorreos(CORREO, 2);
});

await paso('revierte el rechazo', async () => {
  await aud.getByRole('button', { name: 'Revertir rechazo' }).click();
  await aud.getByRole('button', { name: 'Conciliar' }).waitFor();
});

await paso('vincular entradas abre la hoja', async () => {
  await aud.getByRole('button', { name: 'Vincular entradas' }).first().click();
  await aud.getByRole('dialog', { name: 'Vincular entradas' }).waitFor();
  await revisar(aud, 'hoja de vincular', 'C08-conciliacion/construida-vincular.png');
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
