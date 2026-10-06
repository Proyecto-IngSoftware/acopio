// Extrae los diagramas Mermaid de la bóveda y genera, sin copiarlos a mano:
//   - diagramas-acopio.html → página para publicar como Artifact
//   - mmd/*.mmd             → fuentes para renderizar los PNG del Word
// Fuentes: ../modelo-datos.md (entidad-relación, invariantes) y ../vista-general.md (C4).
// Uso: node build.mjs   (desde esta carpeta). Si cambia un diagrama en la bóveda,
// se vuelve a correr y se republica; nunca se edita el HTML generado.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const leer = (f) => readFileSync(join(aqui, '..', f), 'utf8').replace(/\r\n/g, '\n');
const modelo = leer('modelo-datos.md');
const vista = leer('vista-general.md');

// ── Utilidades ────────────────────────────────────────────────────────────
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/`/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Markdown mínimo → HTML: párrafos, viñetas, negrita, código y enlaces (queda el texto).
function prosa(md) {
  const bloques = md.replace(/^---$/gm, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return bloques.map((b) => {
    if (b.startsWith('|')) return '';
    if (/^- /m.test(b) && b.split('\n').every((l) => /^(- |\s)/.test(l))) {
      const items = b.split(/\n(?=- )/).map((i) => `<li>${inline(i.replace(/^- /, '').replace(/\n\s+/g, ' '))}</li>`);
      return `<ul>${items.join('')}</ul>`;
    }
    return `<p>${inline(b.replace(/\n/g, ' '))}</p>`;
  }).join('\n');
}

const bloquesMermaid = (md) => [...md.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1].trimEnd());
const sinMermaid = (md) => md.replace(/```mermaid\n[\s\S]*?```/g, '');

// Sección desde un encabezado hasta el siguiente del mismo nivel o superior.
function seccion(md, encabezado) {
  const i = md.indexOf(encabezado);
  if (i < 0) throw new Error(`No encontré: ${encabezado}`);
  const nivel = encabezado.match(/^#+/)[0].length;
  const resto = md.slice(i + encabezado.length);
  const fin = resto.search(new RegExp(`\\n#{1,${nivel}} `));
  return fin < 0 ? resto : resto.slice(0, fin);
}

// ── Tema de Mermaid con los tokens del sistema de diseño ──────────────────
const TEMA = {
  theme: 'base',
  themeVariables: {
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif', fontSize: '15px',
    primaryColor: '#E6F4F4', primaryTextColor: '#1C1917', primaryBorderColor: '#0F6E6E',
    secondaryColor: '#C7E8E8', tertiaryColor: '#FAFAF9', lineColor: '#57534E', textColor: '#1C1917',
    mainBkg: '#E6F4F4', nodeBorder: '#0F6E6E', clusterBkg: '#F5F5F4', clusterBorder: '#A8A29E',
    edgeLabelBackground: '#FFFFFF', attributeBackgroundColorOdd: '#FFFFFF', attributeBackgroundColorEven: '#F5F5F4',
  },
  er: { useMaxWidth: false },
  flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
};
const conTema = (codigo) => `%%{init: ${JSON.stringify(TEMA)}}%%\n${codigo}`;

// ── Modelo de datos ───────────────────────────────────────────────────────
const er = seccion(modelo, '## Diagrama entidad-relación');
const partes = er.split(/\n### /);
const introER = prosa(partes[0]);
const clusters = [];
const notasER = [];
for (const p of partes.slice(1)) {
  const [titulo, ...cuerpo] = p.split('\n');
  const texto = cuerpo.join('\n');
  const diagramas = bloquesMermaid(texto);
  const limpio = titulo.replace(/`/g, '');
  // Un grupo puede tener más de un diagrama (Existencias se dibuja en dos).
  if (diagramas.length) clusters.push({ titulo: limpio, id: slug(limpio), codigo: diagramas[0], codigos: diagramas, notas: prosa(sinMermaid(texto)) });
  else notasER.push({ titulo: limpio, notas: prosa(texto) });
}

const inv = seccion(modelo, '## Invariantes');
const filasInv = inv.split('\n').filter((l) => l.startsWith('|') && !/^\|\s*-/.test(l) && !/Invariante \| Dónde/.test(l))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
const cierreInv = prosa(inv.split('\n').filter((l) => !l.startsWith('|')).join('\n'));
const celda = (t) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>');

// ── Arquitectura ──────────────────────────────────────────────────────────
const c4 = [
  ['## C4 nivel 1 — Contexto', 'Contexto', 'Quién usa Acopio y con qué sistemas externos habla.'],
  ['## C4 nivel 2 — Contenedores', 'Contenedores', 'Qué corre dentro del VPS, cómo se enrutan las peticiones y qué módulos tiene la API.'],
].map(([enc, titulo, bajada]) => {
  const s = seccion(vista, enc);
  return { titulo, id: slug(titulo), bajada, codigo: bloquesMermaid(s)[0], notas: prosa(sinMermaid(s)) };
});

// ── Fuentes .mmd para los PNG ─────────────────────────────────────────────
const dirMmd = join(aqui, 'mmd');
mkdirSync(dirMmd, { recursive: true });
const salidas = [
  ...clusters.flatMap((c, i) => c.codigos.map((cod, k) => [`er-${String(i + 1).padStart(2, '0')}${c.codigos.length > 1 ? 'abcdef'[k] : ''}-${c.id}`, cod])),
  ...c4.map((c, i) => [`arquitectura-${String(i + 1).padStart(2, '0')}-${c.id}`, c.codigo]),
];
for (const [nombre, codigo] of salidas) writeFileSync(join(dirMmd, `${nombre}.mmd`), conTema(codigo) + '\n');

// Datos para el Word del Avance 3 (docs/entregas/generar-avance-03.py): textos en
// Markdown crudo, el nombre del PNG de cada diagrama y las invariantes.
const pngDe = new Map(salidas.map(([nombre, codigo]) => [codigo, `${nombre}.png`]));
writeFileSync(join(aqui, 'datos.json'), JSON.stringify({
  introMd: partes[0].trim(),
  clusters: clusters.map((c) => ({ titulo: c.titulo, pngs: c.codigos.map((cod) => pngDe.get(cod)), md: sinMermaid(partes.slice(1).find((p) => p.split('\n')[0].replace(/`/g, '') === c.titulo).split('\n').slice(1).join('\n')).trim() })),
  notas: notasER.map((n) => ({ titulo: n.titulo, md: partes.slice(1).find((p) => p.split('\n')[0].replace(/`/g, '') === n.titulo).split('\n').slice(1).join('\n').trim() })),
  invariantes: filasInv,
  cierreInvMd: inv.split('\n').filter((l) => !l.startsWith('|')).join('\n').trim(),
  c4: c4.map((c) => ({ titulo: c.titulo, bajada: c.bajada, png: pngDe.get(c.codigo), md: sinMermaid(seccion(vista, c.titulo === 'Contexto' ? '## C4 nivel 1 — Contexto' : '## C4 nivel 2 — Contenedores')).trim() })),
}, null, 1));

// ── Página ────────────────────────────────────────────────────────────────
// Si existe el SVG ya renderizado (svg/<nombre>.svg, lo escribe el renderizador de
// los PNG), se incrusta tal cual: se ve igual en tema claro u oscuro, porque no
// depende del Mermaid del visor, que en oscuro pisa los colores del tema.
const dirSvg = join(aqui, 'svg');
const nombreDe = new Map(salidas.map(([nombre, codigo]) => [codigo, nombre]));
const panel = (codigo, etiqueta) => {
  const archivo = join(dirSvg, `${nombreDe.get(codigo)}.svg`);
  const cuerpo = existsSync(archivo)
    ? readFileSync(archivo, 'utf8')
    : `<pre class="mermaid">${esc(conTema(codigo))}</pre>`;
  return `<figure class="plano" role="img" aria-label="${esc(etiqueta)}">${cuerpo}</figure>`;
};

const pagina = `<title>Modelo y arquitectura de Acopio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,700&display=swap">
<style>
:root{
  --suelo:#FAFAF9; --superficie:#FFFFFF; --tinta:#1C1917; --tinta-2:#57534E; --tinta-3:#78716C;
  --borde:#E7E5E4; --linea:#A8A29E; --acento:#0F6E6E; --acento-suave:#E6F4F4; --foco:#14A0A0;
  --papel:#FFFFFF; --papel-borde:#E7E5E4; --codigo:#F5F5F4;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --suelo:#141312; --superficie:#1E1C1A; --tinta:#F5F5F4; --tinta-2:#B8B2AD; --tinta-3:#8F8883;
    --borde:#34302D; --linea:#5E5853; --acento:#46C6C6; --acento-suave:#12302F; --foco:#46C6C6;
    --papel:#FFFFFF; --papel-borde:#48433F; --codigo:#2A2724;
  }
}
:root[data-theme="dark"]{
  --suelo:#141312; --superficie:#1E1C1A; --tinta:#F5F5F4; --tinta-2:#B8B2AD; --tinta-3:#8F8883;
  --borde:#34302D; --linea:#5E5853; --acento:#46C6C6; --acento-suave:#12302F; --foco:#46C6C6;
  --papel:#FFFFFF; --papel-borde:#48433F; --codigo:#2A2724;
}
*{box-sizing:border-box}
body{background:var(--suelo); color:var(--tinta); font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif; font-size:16px; line-height:1.55; margin:0}
.envoltura{max-width:1240px; margin:0 auto; padding-inline:24px; padding-block:48px 64px}
a{color:var(--acento)} a:hover{color:var(--tinta)}
:focus-visible{outline:2px solid var(--foco); outline-offset:2px; border-radius:6px}
h1,h2,h3{text-wrap:balance; margin:0; font-weight:700; letter-spacing:-0.01em}
h1{font-size:36px; line-height:1.15} h2{font-size:28px; line-height:1.2} h3{font-size:22px; line-height:1.25}
p{margin:0; max-width:72ch} ul{margin:0; padding-left:20px; max-width:72ch}
code{font-family:ui-monospace,'Cascadia Code',Consolas,monospace; font-size:.88em; background:var(--codigo); padding:1px 5px; border-radius:4px}
.ceja{font-size:12px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--tinta-3)}
.cabecera{display:grid; gap:14px; max-width:780px}
.lede{font-size:18px; color:var(--tinta-2)}
.indice{position:sticky; top:0; z-index:5; background:var(--suelo); border-bottom:1px solid var(--borde); margin-top:32px}
.indice nav{display:flex; flex-wrap:wrap; gap:6px 18px; align-items:center; padding-block:12px; font-size:14px}
.indice b{font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:var(--tinta-3); font-weight:700}
.indice a{text-decoration:none; color:var(--tinta-2); padding:6px 0} .indice a:hover{color:var(--acento)}
.bloque{margin-top:64px; display:grid; gap:20px}
.bloque > header{display:grid; gap:10px; max-width:780px}
.bloque > header p{color:var(--tinta-2)}
.diagrama{display:grid; gap:14px; scroll-margin-top:72px; margin-top:20px}
.diagrama .bajada{color:var(--tinta-2)}
.plano{margin:0; background:var(--papel); border:1px solid var(--papel-borde); border-radius:12px; padding:24px; overflow-x:auto}
.plano pre{margin:0; font-family:inherit; color:#1C1917; background:transparent}
.plano svg{display:block; max-width:none; height:auto}
.notas{display:grid; gap:10px; color:var(--tinta-2); font-size:15px}
.notas strong{color:var(--tinta)}
.tabla-c{overflow-x:auto; border:1px solid var(--borde); border-radius:12px; background:var(--superficie)}
table{border-collapse:collapse; width:100%; min-width:620px; font-size:15px}
th,td{text-align:left; padding:10px 16px; border-bottom:1px solid var(--borde); vertical-align:top}
th{font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--tinta-3)}
tr:last-child td{border-bottom:0}
td:last-child{white-space:nowrap; color:var(--tinta-2)}
footer{margin-top:64px; padding-top:20px; border-top:1px solid var(--borde); font-size:14px; color:var(--tinta-2); display:grid; gap:4px}
@media (max-width:640px){
  .envoltura{padding-inline:16px; padding-block:32px 48px}
  h1{font-size:28px} h2{font-size:24px}
  .plano{padding:14px}
}
</style>

<div class="envoltura">
  <header class="cabecera">
    <span class="ceja">Avance 3 · Arquitectura inicial</span>
    <h1>Modelo y arquitectura de Acopio</h1>
    <p class="lede">El modelo de datos en ${clusters.length} diagramas entidad-relación, uno por grupo de tablas, con sus restricciones de integridad, y la arquitectura en dos niveles: el contexto del sistema y sus contenedores.</p>
  </header>

  <div class="indice">
    <nav aria-label="Diagramas">
      <b>Modelo</b>
      ${clusters.map((c) => `<a href="#${c.id}">${esc(c.titulo)}</a>`).join('')}
      <a href="#integridad">Integridad</a>
      <b>Arquitectura</b>
      ${c4.map((c) => `<a href="#${c.id}">${esc(c.titulo)}</a>`).join('')}
    </nav>
  </div>

  <section class="bloque" aria-labelledby="t-modelo">
    <header>
      <span class="ceja">Vista del modelo de datos</span>
      <h2 id="t-modelo">Modelo de datos</h2>
      <div class="notas">${introER}</div>
    </header>
    ${clusters.map((c) => `
    <article class="diagrama" id="${c.id}" aria-labelledby="t-${c.id}">
      <h3 id="t-${c.id}">${esc(c.titulo)}</h3>
      ${c.codigos.map((cod, k) => panel(cod, `Diagrama entidad-relación: ${c.titulo}${c.codigos.length > 1 ? ` (${k + 1} de ${c.codigos.length})` : ''}`)).join('\n      ')}
      ${c.notas ? `<div class="notas">${c.notas}</div>` : ''}
    </article>`).join('')}
    ${notasER.map((n) => `
    <article class="diagrama">
      <h3>${esc(n.titulo)}</h3>
      <div class="notas">${n.notas}</div>
    </article>`).join('')}
    <article class="diagrama" id="integridad" aria-labelledby="t-integridad">
      <h3 id="t-integridad">Restricciones de integridad</h3>
      <p class="bajada">Cada regla se hace cumplir donde no se puede evadir.</p>
      <div class="tabla-c">
        <table>
          <thead><tr><th scope="col">Invariante</th><th scope="col">Dónde se garantiza</th></tr></thead>
          <tbody>${filasInv.map(([a, b]) => `<tr><td>${celda(a)}</td><td>${celda(b)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="notas">${cierreInv}</div>
    </article>
  </section>

  <section class="bloque" aria-labelledby="t-arq">
    <header>
      <span class="ceja">Complemento del ADR-001</span>
      <h2 id="t-arq">Arquitectura</h2>
      <p>Cliente-servidor con el backend como monolito modular en capas, desplegado con Docker Compose en un VPS gestionado con Dokploy.</p>
    </header>
    ${c4.map((c) => `
    <article class="diagrama" id="${c.id}" aria-labelledby="t-${c.id}">
      <h3 id="t-${c.id}">${esc(c.titulo)}</h3>
      <p class="bajada">${esc(c.bajada)}</p>
      ${panel(c.codigo, `Diagrama de arquitectura: ${c.titulo}`)}
      ${c.notas ? `<div class="notas">${c.notas}</div>` : ''}
    </article>`).join('')}
  </section>

  <footer>
    <span>Generado desde docs/02-arquitectura/modelo-datos.md y vista-general.md de la bóveda del proyecto.</span>
    <span>Actualizado el 14 de septiembre de 2026 · Ingeniería de Software I · ETITC</span>
  </footer>
</div>
`;
writeFileSync(join(aqui, 'diagramas-acopio.html'), pagina);
console.log(`ER: ${clusters.map((c) => c.titulo).join(' · ')} | notas: ${notasER.length} | invariantes: ${filasInv.length} | C4: ${c4.length}`);
console.log(`mmd: ${salidas.map(([n]) => n).join(', ')}`);
