// Recorrido público de la pieza E: los puntos de RedAcopio en el mapa (P5), la ficha de uno
// (P6) y las otras plataformas (P14), a 360 × 640, contra la API del Compose con el seed:demo,
// que importa la copia guardada de RedAcopio. No inicia sesión.
//
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/referenciados.mjs
// Escribe las capturas en docs/03-diseno/stitch/ salvo con CAPTURAS=no.
// Con CAPTURAS_WORD=<carpeta> guarda además cada captura del alto de la pantalla, para el Word. Sale con 1 si falla un paso.
/* global window, document */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WEB = process.env.WEB ?? 'http://localhost:5173';
const DISENO = fileURLToPath(new URL('../../../docs/03-diseno/stitch/', import.meta.url));
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

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
await paso('P5 dibuja los puntos de RedAcopio con su leyenda', async () => {
  await p.goto(`${WEB}/mapa`);
  await p.getByRole('heading', { level: 1, name: 'Mapa de acopios' }).waitFor();
  await p.getByText('RedAcopio Bogotá: datos de su fuente').waitFor();
  const casilla = p.getByRole('checkbox', { name: /Mostrar puntos de RedAcopio/ });
  if (!(await casilla.isChecked())) throw new Error('la casilla empieza apagada');
  await revisar(p, 'P5 con referenciados', 'P05-mapa/construida-referenciados.png');
});

await paso('con la casilla apagada desaparece la leyenda de RedAcopio', async () => {
  await p.getByRole('checkbox', { name: /Mostrar puntos de RedAcopio/ }).click();
  await p.getByText('RedAcopio Bogotá: datos de su fuente').waitFor({ state: 'detached' });
  await p.getByRole('checkbox', { name: /Mostrar puntos de RedAcopio/ }).click();
  await p.getByText('RedAcopio Bogotá: datos de su fuente').waitFor();
});

await paso('en la lista, los puntos van en su sección con la atribución', async () => {
  await p.locator('label', { hasText: 'Lista' }).click();
  const seccion = p.getByRole('region', { name: 'Puntos de RedAcopio Bogotá' });
  await seccion.waitFor();
  await seccion
    .getByText(/según RedAcopio/)
    .first()
    .waitFor();
  await seccion.getByRole('link', { name: 'RedAcopio Bogotá' }).waitFor();
  await revisar(p, 'P5 lista', 'P05-mapa/construida-referenciados-lista.png');
});

await paso('P6 de Sugoi Taller Creativo muestra la fuente y no ofrece donar', async () => {
  await p.getByRole('link', { name: /Sugoi Taller Creativo/ }).click();
  await p.getByRole('heading', { level: 1, name: 'Sugoi Taller Creativo' }).waitFor();
  await p.getByText('Punto de RedAcopio Bogotá').waitFor();
  await p.getByText(/Datos de RedAcopio actualizados/).waitFor();
  await p.getByRole('link', { name: /Ver en RedAcopio/ }).waitFor();
  await p.getByRole('region', { name: /Lo que piden/ }).waitFor();
  for (const texto of ['Preparar donación', 'Lo que urge', 'Voluntariado']) {
    if (await p.getByText(texto, { exact: true }).count()) throw new Error(`sale «${texto}»`);
  }
  await revisar(p, 'P6 referenciado', 'P06-ficha-referenciado/construida.png');
});

await paso('P14 lista las plataformas desde «Más»', async () => {
  await p.goto(`${WEB}/mas`);
  await p.getByRole('link', { name: /Otras plataformas/ }).click();
  await p.getByRole('heading', { level: 1, name: 'Otras plataformas que ayudan' }).waitFor();
  await p
    .getByRole('link', { name: /Ir al sitio de/ })
    .first()
    .waitFor();
  const enlaces = await p.getByRole('link', { name: /Ir al sitio de/ }).count();
  if (enlaces !== 9) throw new Error(`${enlaces} plataformas`);
  await p.getByText(/Acopio no las verifica/).waitFor();
  await revisar(p, 'P14', 'P14-plataformas/construida.png');
});

await paso('la portada lleva a las plataformas desde su pie', async () => {
  await p.goto(`${WEB}/`);
  await p.getByRole('link', { name: /Otras plataformas que ayudan/ }).click();
  await p.getByRole('heading', { level: 1, name: 'Otras plataformas que ayudan' }).waitFor();
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
