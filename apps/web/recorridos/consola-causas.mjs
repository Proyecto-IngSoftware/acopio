// Recorrido de consola de la pieza C: el Administrador verifica una entidad con el aviso,
// publica una causa, la renueva, archiva otra y le quita la verificación a la entidad; en P4
// el enlace al sitio oficial desaparece. A 360 × 640, contra la API del Compose. Cada corrida
// usa una entidad nueva, así no toca las causas «(demo)».
//
//   bun run --filter @acopio/web build && (cd apps/web && bunx vite preview)
//   node apps/web/recorridos/consola-causas.mjs
// ADMIN_CONTRASENA cambia la del administrador del seed. Escribe capturas salvo con CAPTURAS=no.
// Con CAPTURAS_WORD=<carpeta> guarda además cada captura del alto de la pantalla, para el Word.
/* global window, document */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WEB = process.env.WEB ?? 'http://localhost:5173';
const ADMIN = process.env.ADMIN_CONTRASENA ?? 'cambiar-antes-de-usar';
const DISENO = fileURLToPath(new URL('../../../docs/03-diseno/stitch/', import.meta.url));
const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const SELLO = Date.now().toString(36);
const NOMBRE = `Fundación Recorrido ${SELLO}`;
const SITIO = `https://www.recorrido-${SELLO}.org`;

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

let entidadId = '';
let causaId = '';
await paso('el Administrador entra y crea una entidad con sitio web', async () => {
  await entrar('admin', ADMIN);
  const e = await api('POST', '/api/entidades', await cookie(), {
    nombre: NOMBRE,
    tipo: 'Fundación',
    sitioWeb: SITIO,
  });
  entidadId = e.id;
});

await paso('C15: verificar pide marcar la casilla del aviso', async () => {
  await p.goto(`${WEB}/consola/entidades`);
  await p.getByRole('button', { name: new RegExp(NOMBRE) }).click();
  await p
    .getByRole('dialog', { name: NOMBRE })
    .getByRole('button', { name: 'Verificar entidad' })
    .click();
  const aviso = p.getByRole('dialog', { name: `Verificar ${NOMBRE}` });
  const boton = aviso.getByRole('button', { name: 'Verificar entidad' });
  if (!(await boton.isDisabled())) throw new Error('el botón no empieza inactivo');
  await revisar(p, 'aviso', 'C15-entidades/construida-verificar.png');
  await aviso.getByRole('checkbox').check();
  await boton.click();
  await p
    .getByRole('button', { name: new RegExp(NOMBRE) })
    .getByText(/Verificada el/)
    .waitFor();
});

await paso('C22: publica una causa con la confirmación de destino', async () => {
  await p.goto(`${WEB}/consola/causas`);
  await p.getByRole('heading', { level: 1, name: 'Causas' }).waitFor();
  await revisar(p, 'C22', 'C22-causas/construida.png');
  await p.getByRole('button', { name: 'Nueva causa' }).click();
  const form = p.getByRole('form', { name: 'Nueva causa' });
  await form.getByLabel('Entidad').selectOption({ label: NOMBRE });
  await form.getByRole('button', { name: 'Rescatistas' }).click();
  await form.getByLabel('Título').fill(`Equipos de rescate ${SELLO}`);
  await form
    .getByLabel('Descripción')
    .fill('Cascos, linternas y cuerdas para los rescatistas del recorrido');
  await form.getByLabel('Paso 1', { exact: true }).fill('Entra al sitio oficial');
  await form.getByRole('button', { name: 'Agregar paso' }).click();
  await form.getByLabel('Paso 2', { exact: true }).fill('Elige donar');
  await form.getByLabel('Enlace oficial').fill(`${SITIO}/donar`);
  await form.getByLabel('Fecha de cierre').fill(enDias(10));
  await revisar(p, 'formulario', 'C22-causas/construida-formulario.png');
  await form.getByRole('button', { name: 'Publicar causa' }).click();
  const confirmar = p.getByRole('dialog', { name: '¿Publicar esta causa?' });
  await confirmar.getByText(`recorrido-${SELLO}.org`).waitFor();
  await confirmar.getByRole('button', { name: 'Publicar' }).click();
  await p.getByRole('button', { name: new RegExp(`Equipos de rescate ${SELLO}`) }).waitFor();
  const lista = await api('GET', '/api/causas/gestion?estado=activas', await cookie());
  causaId = lista.find((c) => c.titulo === `Equipos de rescate ${SELLO}`)?.id;
  if (!causaId) throw new Error('la causa no quedó activa');
});

await paso('renovar la causa con una fecha nueva', async () => {
  await p.getByRole('button', { name: new RegExp(`Equipos de rescate ${SELLO}`) }).click();
  await p.getByText(/Cierra pronto/).waitFor();
  await p.getByLabel('Renovar hasta').fill(enDias(90));
  await p.getByRole('button', { name: 'Renovar', exact: true }).click();
  await p
    .getByRole('dialog', { name: '¿Renovar esta causa?' })
    .getByRole('button', { name: 'Renovar' })
    .click();
  await p.getByRole('heading', { level: 1, name: 'Causas' }).waitFor();
  const c = await api('GET', `/api/causas/${causaId}`, await cookie());
  if (c.cierraEl !== enDias(90)) throw new Error(`cierra el ${c.cierraEl}`);
});

await paso('archivar otra causa la pasa a atendidas', async () => {
  const otra = await api('POST', '/api/causas', await cookie(), {
    entidadId,
    categoria: 'PERSONAS',
    titulo: `Mercados ${SELLO}`,
    descripcion: 'Una causa del recorrido que se archiva enseguida',
    pasos: ['Entra al sitio oficial'],
    urlOficial: SITIO,
    cierraEl: enDias(30),
    confirmo: true,
  });
  await p.reload();
  await p.getByRole('button', { name: new RegExp(`Mercados ${SELLO}`) }).click();
  await p.getByRole('button', { name: 'Archivar ahora' }).click();
  await p.getByRole('heading', { level: 1, name: 'Causas' }).waitFor();
  const c = await api('GET', `/api/causas/${otra.id}`, await cookie());
  if (c.motivo !== 'MANUAL') throw new Error(`motivo ${c.motivo}`);
});

await paso('quitar la verificación corta el enlace en la ficha pública', async () => {
  await p.goto(`${WEB}/consola/entidades`);
  await p.getByRole('button', { name: new RegExp(NOMBRE) }).click();
  await p
    .getByRole('dialog', { name: NOMBRE })
    .getByRole('button', { name: 'Quitar verificación' })
    .click();
  const confirmar = p.getByRole('dialog', { name: '¿Quitar la verificación?' });
  await confirmar.getByText(/Su única causa activa pasa a atendidas/).waitFor();
  await confirmar.getByRole('button', { name: 'Quitar verificación' }).click();
  await p.goto(`${WEB}/causas/${causaId}`);
  await p.getByText('Esta entidad ya no está verificada por Acopio.').waitFor();
  if (await p.getByRole('button', { name: /Ir al sitio oficial/ }).count()) {
    throw new Error('sigue el botón al sitio oficial');
  }
  await revisar(p, 'P4 sin verificación', 'P04-ficha-causa/construida-sin-verificar.png');
});

await b.close();
console.log(`\nErrores de la página: ${errores.length}`);
for (const e of errores.slice(0, 10)) console.log('  ', e.slice(0, 200));
console.log(`Resultado: ${bien} bien, ${mal} mal`);
process.exit(mal || errores.length ? 1 : 0);
