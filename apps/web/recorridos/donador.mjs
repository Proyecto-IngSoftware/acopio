// Recorrido del cierre del ciclo 1 del Bloque 3: la interfaz del Donador de punta a punta,
// a 360 × 640, contra la API del Compose. Crea una cuenta con un correo nuevo, confirma el
// correo con el enlace de Mailpit, prepara una donación, adjunta una foto, sigue el folio y
// la cancela.
//
// Necesita el Compose con la API reconstruida, seed y seed:demo corridos, y el build servido:
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/donador.mjs
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

const CORREO = `donador-${Date.now()}@demo.acopio.local`;
const CONTRASENA = 'recorrido-donador-2026';
// PNG de 1 × 1: basta para que la API lo decodifique y lo guarde
const FOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

let bien = 0;
let cerrar = async () => {};
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

async function enlaceDelCorreo() {
  for (let i = 0; i < 100; i++) {
    const lista = await (
      await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${CORREO}`)}`)
    ).json();
    const id = lista.messages?.[0]?.ID;
    if (id) {
      const m = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
      const hallado = /https?:\/\/[^\s"<>]*\/donador\/confirmar\/[\w-]+/.exec(
        `${m.Text}\n${m.HTML}`,
      );
      if (hallado) return hallado[0];
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('el correo de confirmación no llegó a Mailpit');
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
cerrar = async () => {
  await b.close();
  console.log(`Resultado: ${bien} bien, ${mal} mal`);
  process.exit(1);
};
p.on('pageerror', (e) => errores.push(e.message));

await paso('crear cuenta con un correo nuevo', async () => {
  await p.goto(`${WEB}/donador`);
  await p.getByRole('heading', { name: 'Tu cuenta de Donador' }).waitFor();
  await revisar(p, 'P13 sin sesión', 'P13-mi-cuenta/construida-sin-sesion.png');
  await p.getByLabel('Nombre').fill('Camila Recorrido');
  await p.getByLabel('Correo').fill(CORREO);
  await p.getByRole('button', { name: 'Crear cuenta' }).click();
  await p.getByText(/Te enviamos un correo para confirmar/).waitFor();
});

await paso('el enlace del correo pide la contraseña', async () => {
  const enlace = await enlaceDelCorreo();
  await p.goto(`${WEB}${new URL(enlace).pathname}`);
  await p.getByRole('heading', { name: 'Elige tu contraseña' }).waitFor();
  await revisar(p, 'P13 confirmar', 'P13-confirmar/construida.png');
  await p.getByLabel('Contraseña', { exact: true }).fill(CONTRASENA);
  await p.getByLabel('Repite la contraseña').fill(CONTRASENA);
  await p.getByRole('button', { name: 'Guardar y entrar' }).click();
  await p.getByRole('heading', { name: 'Mis donaciones' }).waitFor();
  await revisar(p, 'P13 mis donaciones vacía');
});

await paso('preparar: buscar una categoría', async () => {
  await p.goto(`${WEB}/donar`);
  await p.getByRole('heading', { name: 'Preparar donación' }).waitFor();
  await p.getByRole('searchbox').fill('arroz');
  await p
    .getByRole('button', { name: /^Arroz/ })
    .first()
    .click();
  await p.getByRole('list', { name: 'Lo que llevas' }).waitFor();
  await revisar(p, 'P9 paso 1', 'P09-preparar/construida-paso-1.png');
});

await paso('elegir el primer acopio y adjuntar una foto', async () => {
  await p.getByRole('button', { name: 'Siguiente: dónde entregar' }).click();
  await p.getByRole('heading', { name: '¿Dónde la entregas?' }).waitFor();
  const primero = p.getByRole('radio').first();
  await primero.waitFor();
  await primero.check();
  await p.locator('input[type=file]').setInputFiles({
    name: 'factura.png',
    mimeType: 'image/png',
    buffer: FOTO,
  });
  await revisar(p, 'P9 paso 2', 'P09-preparar/construida-paso-2.png');
});

let folio = '';
await paso('ver el folio', async () => {
  await p.getByRole('button', { name: 'Preparar y ver mi folio' }).click();
  await p.getByRole('heading', { name: 'Tu donación está preparada' }).waitFor();
  folio =
    (await p
      .getByText(/^[A-Z]{2,4}-\d{4}-[A-Z0-9]{5}$/)
      .first()
      .textContent()) ?? '';
  if (!folio) throw new Error('no se leyó el folio');
  await revisar(p, 'P9 paso 3', 'P09-preparar/construida-paso-3.png');
});

await paso('abrir el seguimiento del folio', async () => {
  await p.getByRole('link', { name: 'Seguir esta donación' }).click();
  await p.waitForURL(`${WEB}/seguimiento/${folio}`);
  await p.getByRole('list', { name: 'Avance de la donación' }).waitFor();
  await revisar(p, 'P10 seguimiento', 'P10-seguimiento/construida.png');
});

await paso('privacidad', async () => {
  await p.goto(`${WEB}/privacidad`);
  await p.getByRole('heading', { level: 1 }).waitFor();
  await revisar(p, 'P12 privacidad', 'P12-privacidad/construida.png');
});

await paso('cancelar la donación desde «Mis donaciones»', async () => {
  await p.goto(`${WEB}/donador`);
  await p.getByText(folio, { exact: true }).waitFor();
  await revisar(p, 'P13 mis donaciones', 'P13-mi-cuenta/construida.png');
  await p.getByRole('button', { name: 'Cancelar donación' }).click();
  await p.getByRole('button', { name: 'Sí, cancelar' }).click();
  await p.getByText('Cancelada').first().waitFor();
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
