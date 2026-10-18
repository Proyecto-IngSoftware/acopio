// Recorrido del cierre del ciclo 1 del Bloque 4: el motor para el Administrador, a 360 × 640,
// contra la API del Compose con el seed:demo. Sigue los pasos 1 a 3 del §1 de la
// especificación: la ficha de una zona, un recálculo, aprobar con la cantidad editada,
// descartar con motivo, mover los pesos con vista previa y el informe de descartes.
//
// Necesita el Compose con la API reconstruida, seed y seed:demo corridos, y el build servido:
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/consola-motor.mjs
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
const DISENO = fileURLToPath(new URL('../../../docs/03-diseno/stitch/', import.meta.url));
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const ZONA_DEMO = 'd0000000-0000-4000-8000-000000000031';

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
async function api(metodo, ruta, cookie) {
  const r = await fetch(`${WEB}${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', origin: WEB, cookie },
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
const par = (s) => `${s.acopio.id}|${s.zona.id}|${s.categoria.id}`;

await paso('el Administrador entra', async () => {
  await p.goto(`${WEB}/entrar`);
  await p.getByLabel('Nombre de usuario').fill('admin');
  await p.getByLabel('Contraseña', { exact: true }).fill(ADMIN);
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForURL(`${WEB}/`);
});

await paso('C9 lleva a la ficha de la zona de la demo', async () => {
  await p.goto(`${WEB}/consola/zonas`);
  await p
    .getByRole('link', { name: /Barrio San Agustín/ })
    .first()
    .click();
  await p.waitForURL(`${WEB}/consola/zonas/${ZONA_DEMO}`);
});

await paso('la ficha muestra cobertura, población con su fuente y «en camino»', async () => {
  await p.getByText('Cobertura de la zona').first().waitFor();
  await p
    .getByText(/personas/)
    .first()
    .waitFor();
  await p.getByText(/estimado el/).waitFor();
  await p
    .getByText(/En camino/)
    .first()
    .waitFor();
  await revisar(p, 'C10', 'C10-ficha-zona/construida.png');
});

await paso('la hoja de una categoría muestra el cálculo y la corrección', async () => {
  await p.getByRole('list', { name: 'Por categoría' }).getByRole('button').first().click();
  await p.getByRole('button', { name: 'Guardar corrección' }).waitFor();
  await revisar(p, 'hoja de categoría', 'C10-ficha-zona/construida-hoja.png');
  await p.keyboard.press('Escape');
});

await paso('C11 recalcula y deja sugerencias con justificación y cuatro componentes', async () => {
  await p.goto(`${WEB}/consola/motor`);
  await p.getByRole('button', { name: 'Recalcular' }).click();
  await p.getByText(/Ronda nueva: \d+/).waitFor();
  const tarjetas = p.getByRole('article');
  await tarjetas.first().waitFor();
  if ((await tarjetas.count()) < 2) throw new Error('hay menos de dos sugerencias');
  if ((await tarjetas.first().getByRole('meter').count()) !== 4) {
    throw new Error('la tarjeta no tiene los cuatro componentes');
  }
  await revisar(p, 'C11', 'C11-motor/construida.png');
});

let codigo = '';
let aprobada = 0;
await paso('aprueba la primera con la cantidad editada y queda en un borrador', async () => {
  await p.getByRole('article').first().getByRole('button', { name: 'Aprobar' }).click();
  const hoja = p.getByRole('dialog', { name: 'Aprobar traslado' });
  await hoja.getByRole('button', { name: 'Quitar uno' }).click();
  aprobada = Number((await hoja.getByLabel(/Cantidad/).inputValue()).replace(',', '.'));
  await revisar(p, 'hoja de aprobar', 'C11-motor/construida-aprobar.png');
  await hoja.getByRole('button', { name: /^Aprobar / }).click();
  const aviso = await p.getByText(/Se creó la remisión|Sumado a/).textContent();
  codigo = /R-\d{4}-\w+/.exec(aviso ?? '')?.[0] ?? '';
  const borradores = await api('GET', '/api/remisiones?estado=BORRADOR', await cookie());
  const remision = borradores.find((r) => r.codigo === codigo);
  if (!remision) throw new Error(`no está el borrador ${codigo}`);
  if (!remision.lineas.some((l) => Math.abs(l.cantidadPlaneada - aprobada) < 0.001)) {
    throw new Error(`el borrador ${codigo} no tiene una línea de ${aprobada}`);
  }
});

await paso('descarta otra con motivo y no vuelve en el recálculo siguiente', async () => {
  const antes = await api('GET', '/api/sugerencias?estado=PROPUESTA', await cookie());
  const elegida = antes[0];
  if (!elegida) throw new Error('no quedan propuestas para descartar');
  await p.reload();
  const tarjeta = p.getByRole('article').filter({ hasText: elegida.justificacion }).first();
  await tarjeta.getByRole('button', { name: 'Descartar' }).click();
  const hoja = p.getByRole('dialog', { name: 'Descartar traslado' });
  await hoja.getByRole('button', { name: 'La vía está cerrada' }).click();
  await hoja.getByRole('button', { name: 'Descartar' }).click();
  await p.getByText(/Sugerencia descartada/).waitFor();
  await api('POST', '/api/sugerencias/recalcular', await cookie());
  const despues = await api('GET', '/api/sugerencias?estado=PROPUESTA', await cookie());
  if (despues.some((s) => par(s) === par(elegida))) {
    throw new Error('el par descartado volvió en el recálculo');
  }
});

await paso('los pesos muestran la vista previa sin guardar y se descartan', async () => {
  await p.goto(`${WEB}/consola/motor/pesos`);
  const guardados = (await api('GET', '/api/motor/configuracion', await cookie())).pesos;
  // Pasa 0,05 de criticidad a magnitud: la suma sigue en 1
  const criticidad = Math.round((guardados.criticidad - 0.05) * 100) / 100;
  const magnitud = Math.round((guardados.magnitud + 0.05) * 100) / 100;
  await p.getByRole('slider', { name: 'Criticidad' }).fill(String(criticidad));
  await p.getByRole('slider', { name: 'Magnitud' }).fill(String(magnitud));
  // Tras varias corridas puede no quedar nada que sugerir: cualquiera de las dos respuestas
  // prueba que la vista previa se pidió sin guardar
  await p
    .getByRole('list', { name: 'Con los pesos nuevos' })
    .or(p.getByText('Con estos pesos el motor no sugiere ningún traslado'))
    .waitFor();
  await revisar(p, 'pesos', 'C11-motor/construida-pesos.png');
  await p.getByRole('button', { name: 'Descartar cambios' }).click();
  const despues = (await api('GET', '/api/motor/configuracion', await cookie())).pesos;
  if (despues.criticidad !== guardados.criticidad || despues.magnitud !== guardados.magnitud) {
    throw new Error('la vista previa guardó los pesos');
  }
});

await paso('el informe de descartes incluye el motivo', async () => {
  await p.goto(`${WEB}/consola/motor/descartes`);
  await p.getByRole('table', { name: 'Por motivo' }).getByText('La vía está cerrada').waitFor();
  await revisar(p, 'descartes');
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
