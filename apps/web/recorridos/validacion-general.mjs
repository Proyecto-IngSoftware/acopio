// Validación general de la web contra la API del Compose, a 360 × 640. Recorre cada pantalla
// con cada rol (sin sesión, Administrador, Operador, Auditor y Donador) y revisa que cargue su
// título, que axe no marque violaciones graves, que no haya scroll horizontal, que la API no
// responda 5xx y que la página no lance errores. Comprueba también los accesos negados y unas
// acciones de punta a punta: invitar y activar una cuenta, registrar una salida y un ajuste.
//
// Necesita el Compose con la API reconstruida, seed y seed:demo corridos, y el build servido:
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/validacion-general.mjs
// Sale con 1 si falla un paso. ADMIN_CONTRASENA cambia la del administrador del seed.
// window y document se usan dentro de page.evaluate, que corre en el navegador
/* global window, document */
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const WEB = process.env.WEB ?? 'http://localhost:5173';
const MAILPIT = process.env.MAILPIT ?? 'http://localhost:8025';
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const CHAPINERO = 'd0000000-0000-4000-8000-000000000011';
const DEMO = 'demo-acopio-2026';
const ADMIN = process.env.ADMIN_CONTRASENA ?? 'cambiar-antes-de-usar';
const SELLO = Date.now().toString(36);

let bien = 0;
let mal = 0;
const fallas = [];
const erroresPagina = [];
const respuestas5xx = [];

async function paso(nombre, fn) {
  try {
    await fn();
    bien++;
    console.log('ok   ', nombre);
  } catch (e) {
    mal++;
    const linea = String(e.message).split('\n')[0];
    fallas.push(`${nombre}: ${linea}`);
    console.log('FALLA', nombre, '—', linea);
  }
}

async function revisar(p, nombre) {
  await p.waitForTimeout(400);
  await p.addScriptTag({ path: axe });
  const r = await p.evaluate(() => window.axe.run(document));
  const graves = r.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  if (graves.length || ancho > 360) {
    throw new Error(
      `${nombre}: axe ${graves.map((v) => `${v.id}(${v.nodes.length})`).join(',') || 'ninguna'}, ancho ${ancho}`,
    );
  }
}

const b = await chromium.launch();
async function contexto(etiqueta) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erroresPagina.push(`[${etiqueta}] ${e.message}`));
  p.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 500) {
      respuestas5xx.push(`[${etiqueta}] ${r.status()} ${r.request().method()} ${r.url()}`);
    }
  });
  return p;
}

async function entrar(p, usuario, contrasena) {
  await p.goto(`${WEB}/entrar`);
  await p.getByLabel('Nombre de usuario').fill(usuario);
  await p.getByLabel('Contraseña', { exact: true }).fill(contrasena);
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForURL(`${WEB}/`);
}

/** Abre la ruta, espera un h1 y revisa que no sea una pantalla de error. */
async function visitar(p, ruta, { titulo, negado = false } = {}) {
  await p.goto(`${WEB}${ruta}`);
  const h1 = p.getByRole('heading', { level: 1 }).first();
  await h1.waitFor({ timeout: 15_000 });
  await p.waitForLoadState('networkidle');
  const texto = (await h1.textContent())?.trim() ?? '';
  if (negado) {
    if (texto !== 'No tienes acceso')
      throw new Error(`esperaba «No tienes acceso» y vio «${texto}»`);
    return;
  }
  if (['No tienes acceso', 'No encontramos esta página'].includes(texto)) {
    throw new Error(`vio «${texto}»`);
  }
  if (titulo && !texto.includes(titulo)) throw new Error(`esperaba «${titulo}» y vio «${texto}»`);
  if (await p.getByRole('button', { name: 'Reintentar' }).count()) {
    throw new Error('la pantalla muestra un error con «Reintentar»');
  }
  await revisar(p, ruta);
}

// ── Sin sesión ──
const publico = await contexto('público');
for (const [ruta, titulo] of [
  ['/', null],
  ['/mapa', 'Mapa de acopios'],
  [`/acopios/${CHAPINERO}`, 'Acopio Chapinero'],
  ['/seguimiento/ACO-2026-DEMA4', 'Seguir una donación'],
  ['/privacidad', 'Cómo usamos tus datos'],
  ['/mas', 'Más'],
  ['/donador', 'Tu cuenta de Donador'],
  ['/causas', 'Próximamente'],
]) {
  await paso(`público ${ruta}`, () => visitar(publico, ruta, { titulo }));
}
await paso('público: una ruta que no existe lo dice', async () => {
  await publico.goto(`${WEB}/no-existe-${SELLO}`);
  await publico.getByRole('heading', { name: 'No encontramos esta página' }).waitFor();
});
await paso('público: la consola pide entrar', async () => {
  await publico.goto(`${WEB}/consola/bitacora`);
  await publico.waitForURL(/\/entrar/);
});
await paso('público: el formulario de la Portada lleva al seguimiento', async () => {
  await publico.goto(WEB);
  const campo = publico.getByRole('textbox', { name: /folio/i }).first();
  await campo.fill('ACO-2026-DEMA4');
  await campo.press('Enter');
  await publico.waitForURL(`${WEB}/seguimiento/ACO-2026-DEMA4`);
});

// ── Administrador ──
const admin = await contexto('admin');
await paso('admin entra', () => entrar(admin, 'admin', ADMIN));
for (const [ruta, titulo] of [
  ['/mas', 'Más'],
  ['/consola/usuarios', null],
  ['/consola/usuarios/invitar', 'Invitar persona'],
  ['/consola/catalogo', 'Catálogo maestro'],
  ['/consola/acopios', 'Acopios'],
  ['/consola/acopios/nuevo', 'Nuevo acopio'],
  [`/consola/acopios/${CHAPINERO}`, null],
  ['/consola/entidades', 'Entidades'],
  ['/consola/zonas', null],
  ['/consola/bitacora', 'Bitácora'],
  ['/consola/comprobantes', 'Comprobantes'],
  [`/consola/acopios/${CHAPINERO}/inventario`, 'Inventario'],
  [`/consola/acopios/${CHAPINERO}/operacion`, null],
  [`/consola/acopios/${CHAPINERO}/no-recibir`, null],
]) {
  await paso(`admin ${ruta}`, () => visitar(admin, ruta, { titulo }));
}
await paso('admin no registra movimientos (C4 es del Operador)', () =>
  visitar(admin, `/consola/acopios/${CHAPINERO}/entrada`, { negado: true }),
);

const usuarioNuevo = `val.${SELLO}`;
const correoNuevo = `val-${SELLO}@demo.acopio.local`;
await paso('admin invita a un Administrador con correo', async () => {
  await admin.goto(`${WEB}/consola/usuarios/invitar`);
  await admin.getByLabel('Nombre completo').fill('Valeria Validación');
  await admin.getByLabel('Nombre de usuario').fill(usuarioNuevo);
  await admin.getByRole('radio', { name: /Administrador/ }).check();
  await admin.getByLabel(/Correo/).fill(correoNuevo);
  await admin.getByRole('button', { name: 'Crear e invitar' }).click();
  await admin.getByRole('button', { name: 'Copiar enlace' }).waitFor();
});

let enlace = '';
await paso('el correo de la invitación llega a Mailpit', async () => {
  // La cola de correo sale cada minuto
  for (let i = 0; i < 120 && !enlace; i++) {
    const lista = await (
      await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${correoNuevo}`)}`)
    ).json();
    const id = lista.messages?.[0]?.ID;
    if (id) {
      const m = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
      enlace = /https?:\/\/[^\s"<>]*\/invitacion\/[\w-]+/.exec(`${m.Text}\n${m.HTML}`)?.[0] ?? '';
    }
    if (!enlace) await new Promise((r) => setTimeout(r, 1000));
  }
  if (!enlace) throw new Error('no llegó el enlace');
});

const nuevo = await contexto('nuevo');
await paso('la persona invitada activa su cuenta y entra', async () => {
  await nuevo.goto(`${WEB}${new URL(enlace).pathname}`);
  await nuevo.getByLabel('Contraseña', { exact: true }).waitFor();
  await revisar(nuevo, 'activar');
  await nuevo.getByLabel('Contraseña', { exact: true }).fill('cielo-azul-de-mocoa-2026');
  await nuevo.getByLabel('Repite la contraseña').fill('cielo-azul-de-mocoa-2026');
  await nuevo.getByRole('button', { name: 'Activar mi cuenta' }).click();
  await nuevo.waitForURL(/\/entrar/);
  await entrar(nuevo, usuarioNuevo, 'cielo-azul-de-mocoa-2026');
  await visitar(nuevo, '/consola/usuarios');
});

// ── Operador ──
const op = await contexto('operador1');
await paso('operador1 entra', () => entrar(op, 'operador1', DEMO));
for (const [ruta, titulo] of [
  ['/mas', 'Más'],
  [`/consola/acopios/${CHAPINERO}/inventario`, 'Inventario'],
  [`/consola/acopios/${CHAPINERO}/entrada`, 'Entrada rápida'],
  [`/consola/acopios/${CHAPINERO}/salida`, 'salida'],
  [`/consola/acopios/${CHAPINERO}/conteo`, 'Conteo físico'],
  [`/consola/acopios/${CHAPINERO}/recibir`, 'Recibir por folio'],
  [`/consola/acopios/${CHAPINERO}/operacion`, null],
  [`/consola/acopios/${CHAPINERO}/no-recibir`, null],
  ['/consola/sin-sincronizar', 'Sin sincronizar'],
]) {
  await paso(`operador1 ${ruta}`, () => visitar(op, ruta, { titulo }));
}
for (const ruta of ['/consola/usuarios', '/consola/comprobantes', '/consola/catalogo']) {
  await paso(`operador1 no entra a ${ruta}`, () => visitar(op, ruta, { negado: true }));
}
await paso('operador1 abre el historial de una categoría desde C3', async () => {
  await op.goto(`${WEB}/consola/acopios/${CHAPINERO}/inventario`);
  await op.getByRole('heading', { level: 1 }).first().waitFor();
  await op.locator(`a[href*="/consola/acopios/${CHAPINERO}/inventario/"]`).first().click();
  await op.waitForURL(new RegExp(`/inventario/[0-9a-f-]{36}`));
  await op.getByRole('heading', { level: 1 }).first().waitFor();
  await revisar(op, 'historial');
});

const teclear = async (p, ...teclas) => {
  const teclado = p.getByRole('group', { name: 'Teclado numérico' });
  for (const t of teclas) await teclado.getByRole('button', { name: t, exact: true }).click();
};

await paso('operador1 registra una salida de 1 kg de arroz', async () => {
  await op.goto(`${WEB}/consola/acopios/${CHAPINERO}/salida`);
  await op.getByRole('searchbox', { name: 'Categoría' }).fill('arroz');
  await op
    .getByRole('button', { name: /^Arroz/ })
    .first()
    .click();
  await op.getByRole('region', { name: 'Categoría elegida' }).waitFor();
  await teclear(op, '1');
  await op.getByRole('radio', { name: 'Entrega directa a familias' }).check();
  await op.getByRole('button', { name: /Registrar salida/ }).click();
  await op
    .getByRole('status')
    .filter({ hasText: /Arroz: [\d.,]+ kg/ })
    .first()
    .waitFor();
});

await paso('operador1 ajusta el arroz con un conteo físico', async () => {
  await op.goto(`${WEB}/consola/acopios/${CHAPINERO}/conteo`);
  await op.getByRole('searchbox', { name: 'Categoría' }).fill('arroz');
  await op
    .getByRole('button', { name: /^Arroz/ })
    .first()
    .click();
  const elegida = op.getByRole('region', { name: 'Categoría elegida' });
  await elegida.waitFor();
  const sistema = /En el sistema: ([\d.,]+)/.exec((await elegida.textContent()) ?? '')?.[1];
  if (!sistema) throw new Error('no se leyó el saldo en el sistema');
  const saldo = Number(sistema.replace(/\./g, '').replace(',', '.'));
  const contado = String(Math.max(0, Math.floor(saldo) - 1));
  await teclear(op, ...contado.split(''));
  await op.getByRole('textbox', { name: 'Motivo del ajuste' }).fill('Validación general: conteo');
  await op.getByRole('button', { name: /Registrar ajuste/ }).click();
  await op
    .getByRole('status')
    .filter({ hasText: /Arroz: [\d.,]+ kg/ })
    .first()
    .waitFor();
});

// ── Auditor ──
const aud = await contexto('auditor1');
await paso('auditor1 entra', () => entrar(aud, 'auditor1', DEMO));
for (const [ruta, titulo] of [
  ['/mas', 'Más'],
  ['/consola/bitacora', 'Bitácora'],
  ['/consola/accesos', 'Matriz de acceso'],
  ['/consola/comprobantes', 'Comprobantes'],
  [`/consola/acopios/${CHAPINERO}/inventario`, 'Inventario'],
]) {
  await paso(`auditor1 ${ruta}`, () => visitar(aud, ruta, { titulo }));
}
for (const ruta of [
  '/consola/catalogo',
  '/consola/usuarios',
  `/consola/acopios/${CHAPINERO}/salida`,
]) {
  await paso(`auditor1 no entra a ${ruta}`, () => visitar(aud, ruta, { negado: true }));
}
await paso('la bitácora del Administrador muestra la invitación y la activación', async () => {
  await admin.goto(`${WEB}/consola/bitacora`);
  await admin.getByText(`Invitó a @${usuarioNuevo} como Administrador`).first().waitFor();
  await admin.getByText('Activó su cuenta').first().waitFor();
  await admin.getByText('Registró una salida de Arroz').first().waitFor();
  const crudos = await admin
    .locator('main')
    .getByText(/^[a-z_]+\.[a-z_]+$/)
    .count();
  if (crudos) throw new Error(`${crudos} filas muestran el código interno de la acción`);
});

// ── Donador ──
const don = await contexto('donador1');
await paso('donador1 entra con su correo', async () => {
  await don.goto(`${WEB}/donador`);
  await don.getByRole('radiogroup').getByText('Entrar', { exact: true }).click();
  await don.getByLabel('Correo').fill('donador1@demo.acopio.local');
  await don.getByLabel('Contraseña', { exact: true }).fill(DEMO);
  await don.getByRole('button', { name: 'Entrar' }).last().click();
  await don.getByRole('heading', { name: 'Mis donaciones' }).waitFor();
});
await paso('donador1 /donar', () => visitar(don, '/donar', { titulo: 'Preparar donación' }));
await paso('donador1 no entra a la consola', () =>
  visitar(don, '/consola/comprobantes', { negado: true }),
);

await b.close();
console.log(`\nRespuestas 5xx de la API: ${respuestas5xx.length}`);
for (const r of respuestas5xx.slice(0, 10)) console.log('  ', r);
console.log(`Errores de la página: ${erroresPagina.length}`);
for (const e of erroresPagina.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || respuestas5xx.length || erroresPagina.length ? 1 : 0);
