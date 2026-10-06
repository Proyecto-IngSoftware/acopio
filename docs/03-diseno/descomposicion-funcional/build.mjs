// Genera la descomposición funcional de Acopio desde una sola fuente de datos:
//   - descomposicion-funcional.html  → página para publicar como Artifact
//   - canvas/*.dc.html + canvas.json  → artboards del lienzo de Claude Design
// Uso: node build.mjs   (desde esta carpeta)
// Fuente: docs/01-requerimientos/funcionales/ y P-010 (agrupación en 6 módulos).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));

// ── Títulos oficiales de cada RF activo (75) ──────────────────────────────
const RF = {
  'IDE-001': 'Crear usuario', 'IDE-002': 'Generar enlace de invitación',
  'IDE-003': 'Canjear invitación y definir contraseña', 'IDE-004': 'Iniciar sesión con nombre de usuario',
  'IDE-005': 'Autorizar cada request', 'IDE-006': 'Gestionar asignaciones', 'IDE-007': 'Suspender usuario',
  'IDE-008': 'Proteger al último administrador', 'IDE-009': 'Restablecer acceso',
  'IDE-010': 'Conmutador de contexto activo', 'IDE-011': 'Matriz de acceso', 'IDE-012': 'Bitácora de auditoría',
  'IDE-013': 'Auto-registro de Donador',
  'CAT-001': 'Gestionar categorías', 'CAT-002': 'Buscar categoría por palabra clave',
  'CAT-003': 'Definir la canasta estándar', 'CAT-004': 'Mapear códigos de barras',
  'CAT-005': 'Gestionar emergencias', 'CAT-006': 'Configurar pesos del motor',
  'RED-001': 'Gestionar centros de acopio', 'RED-002': 'Mapa público de acopios', 'RED-003': 'Ficha pública de acopio',
  'RED-004': 'Gestionar zonas afectadas', 'RED-005': 'Gestionar entidades', 'RED-006': 'Verificar entidad',
  'RED-007': 'Gestionar causas', 'RED-008': 'Directorio y ficha de causa', 'RED-009': 'Mapa de necesidades por zona',
  'RED-010': 'Archivar una causa', 'RED-011': 'Importar acopios de una fuente externa',
  'HOM-001': 'Portada', 'HOM-002': 'Cómo ayudar', 'HOM-003': 'Gestionar contenido', 'HOM-004': 'Transparencia',
  'HOM-005': 'Páginas legales', 'HOM-006': 'Compartir en redes',
  'INV-001': 'Registrar entrada', 'INV-002': 'Escanear código de barras', 'INV-003': 'Registrar salida',
  'INV-004': 'Ajustar por conteo físico', 'INV-005': 'Consultar saldos', 'INV-006': 'Ver historial de una categoría',
  'INV-007': 'Configurar umbrales', 'INV-008': 'Marcar «no recibir»', 'INV-009': 'Captura sin conexión',
  'INV-010': 'Alerta de vencimiento', 'INV-011': 'Integridad transaccional',
  'CMP-001B': 'Preparar donación con escaneo', 'CMP-001C': 'Confirmar recepción física de una donación preparada',
  'CMP-001D': 'Sugerir punto de entrega', 'CMP-002': 'Almacenar archivos de forma segura',
  'CMP-003': 'Bandeja de pendientes', 'CMP-004': 'Conciliar contra movimiento', 'CMP-005': 'Rechazar comprobante',
  'CMP-006': 'Seguimiento por folio', 'CMP-007': 'Trazabilidad estimada del despacho',
  'CMP-008': 'Historial de donaciones del Donador',
  'TUR-001': 'Crear jornada', 'TUR-002': 'Listado público de jornadas', 'TUR-003': 'Reservar cupo',
  'TUR-004': 'Confirmar y cancelar reserva', 'TUR-005': 'Administrar reservas de una jornada',
  'TUR-006': 'Comunicar la naturaleza del dato', 'TUR-007': 'Voluntariado especializado',
  'MOT-001': 'Registrar zona afectada', 'MOT-002': 'Calcular necesidad de una zona',
  'MOT-003': 'Calcular déficit y cobertura', 'MOT-004': 'Calcular superávit de un acopio',
  'MOT-005': 'Generar sugerencias', 'MOT-006': 'Presentar el ranking', 'MOT-007': 'Aprobar o descartar una sugerencia',
  'MOT-008': 'Gestionar remisiones', 'MOT-009': 'Confirmar recepción en zona', 'MOT-010': 'Evaluar el motor',
  'MOT-011': 'Reportar necesidad de zona', 'MOT-012': 'Ajustar la población de una zona',
};

// RF que no son funcionalidades que alguien use: reglas o propiedades del sistema.
const FUERA = {
  'IDE-005': 'Regla de seguridad: se cumple en cada funcionalidad, no es una acción',
  'INV-011': 'Propiedad del inventario: garantía transaccional, no una acción',
  'CMP-002': 'Propiedad del almacenamiento: la cumple el módulo transversal de archivos',
  'TUR-006': 'Regla de interfaz: cómo se rotulan los cupos en toda pantalla',
};

// ── Descomposición: módulo → submódulo → [funcionalidad, CRUD, RF] ────────
const MODULOS = [
  {
    id: 'portal', archivo: 'PortalPublico', nombre: 'Portal público',
    origen: 'Agrupa M1 Directorio de causas, M2 Mapa de acopios y M7 Home',
    sub: [
      ['Portada y contenido', [
        ['Ver portada', 'R', ['HOM-001']],
        ['Consultar cómo ayudar', 'R', ['HOM-002']],
        ['Consultar páginas legales', 'R', ['HOM-005']],
        ['Compartir en redes', 'R', ['HOM-006']],
      ]],
      ['Mapa de acopios', [
        ['Ver mapa con filtros', 'R', ['RED-002']],
        ['Ver ficha de acopio', 'R', ['RED-003']],
        ['Ver necesidades por zona', 'R', ['RED-009']],
      ]],
      ['Directorio de causas', [
        ['Ver directorio y ficha de causa', 'R', ['RED-008']],
      ]],
      ['Transparencia', [
        ['Ver tablero de transparencia', 'R', ['HOM-004']],
      ]],
    ],
  },
  {
    id: 'turnos', archivo: 'Turnos', nombre: 'Turnos de voluntariado',
    origen: 'Corresponde a M3 Turnos y cupos',
    sub: [
      ['Jornadas', [
        ['Crear jornada', 'C', ['TUR-001']],
        ['Ver jornadas disponibles', 'R', ['TUR-002']],
        ['Exigir perfil especializado', 'CU', ['TUR-007']],
      ]],
      ['Reservas', [
        ['Reservar cupo', 'C', ['TUR-003']],
        ['Consultar o cancelar reserva', 'RD', ['TUR-004']],
        ['Administrar reservas y asistencia', 'RU', ['TUR-005']],
      ]],
    ],
  },
  {
    id: 'inventario', archivo: 'Inventario', nombre: 'Inventario',
    origen: 'Corresponde a M4 Inventario de acopio',
    sub: [
      ['Movimientos', [
        ['Registrar entrada con escaneo', 'C', ['INV-001', 'INV-002']],
        ['Registrar salida', 'C', ['INV-003']],
        ['Ajustar por conteo físico', 'C', ['INV-004']],
        ['Capturar sin conexión', 'C', ['INV-009']],
      ]],
      ['Saldos', [
        ['Consultar saldos', 'R', ['INV-005']],
        ['Ver historial de una categoría', 'R', ['INV-006']],
        ['Recibir alertas de vencimiento', 'R', ['INV-010']],
      ]],
      ['Control de recepción', [
        ['Configurar umbrales', 'CU', ['INV-007']],
        ['Marcar «no recibir»', 'U', ['INV-008']],
      ]],
    ],
  },
  {
    id: 'comprobantes', archivo: 'Comprobantes', nombre: 'Comprobantes y custodia',
    origen: 'Corresponde a M5 Comprobantes y cadena de custodia',
    sub: [
      ['Donación preparada', [
        ['Preparar donación con escaneo', 'C', ['CMP-001B']],
        ['Sugerir punto de entrega', 'R', ['CMP-001D']],
        ['Consultar mi historial de donaciones', 'R', ['CMP-008']],
      ]],
      ['Recepción y conciliación', [
        ['Confirmar recepción física', 'U', ['CMP-001C']],
        ['Revisar bandeja de pendientes', 'R', ['CMP-003']],
        ['Conciliar contra movimiento', 'U', ['CMP-004']],
        ['Rechazar comprobante', 'U', ['CMP-005']],
      ]],
      ['Seguimiento', [
        ['Seguir donación por folio', 'R', ['CMP-006']],
        ['Ver trazabilidad del despacho', 'R', ['CMP-007']],
      ]],
    ],
  },
  {
    id: 'motor', archivo: 'ZonasMotor', nombre: 'Zonas y motor',
    origen: 'Corresponde a M6 Zonas afectadas y motor de emparejamiento',
    sub: [
      ['Zonas afectadas', [
        ['Registrar zona afectada', 'CU', ['MOT-001', 'RED-004']],
        ['Reportar necesidad de zona', 'C', ['MOT-011']],
        ['Ajustar la población de una zona', 'U', ['MOT-012']],
      ]],
      ['Cálculo', [
        ['Calcular necesidad de una zona', 'R', ['MOT-002']],
        ['Calcular déficit y cobertura', 'R', ['MOT-003']],
        ['Calcular superávit de un acopio', 'R', ['MOT-004']],
      ]],
      ['Sugerencias', [
        ['Generar sugerencias', 'C', ['MOT-005']],
        ['Ver ranking de traslados', 'R', ['MOT-006']],
        ['Aprobar o descartar sugerencia', 'U', ['MOT-007']],
        ['Evaluar el motor', 'R', ['MOT-010']],
      ]],
      ['Remisiones', [
        ['Gestionar remisiones', 'CRU', ['MOT-008']],
        ['Confirmar recepción en zona', 'U', ['MOT-009']],
      ]],
    ],
  },
  {
    id: 'admin', archivo: 'Administracion', nombre: 'Administración y acceso',
    origen: 'Identidad, catálogo maestro, gestión de la red y bitácora',
    sub: [
      ['Usuarios y acceso', [
        ['Crear usuario e invitar', 'C', ['IDE-001', 'IDE-002']],
        ['Canjear invitación', 'U', ['IDE-003']],
        ['Iniciar sesión', 'R', ['IDE-004']],
        ['Registrarse como Donador', 'C', ['IDE-013']],
        ['Restablecer acceso', 'U', ['IDE-009']],
        ['Suspender usuario', 'U', ['IDE-007', 'IDE-008']],
        ['Gestionar asignaciones', 'CUD', ['IDE-006']],
        ['Cambiar contexto activo', 'U', ['IDE-010']],
        ['Consultar matriz de acceso', 'R', ['IDE-011']],
      ]],
      ['Catálogo maestro', [
        ['Gestionar categorías', 'CRUD', ['CAT-001']],
        ['Buscar categoría', 'R', ['CAT-002']],
        ['Definir canasta estándar', 'CU', ['CAT-003']],
        ['Mapear códigos de barras', 'CU', ['CAT-004']],
        ['Gestionar emergencias', 'CRU', ['CAT-005']],
        ['Configurar pesos del motor', 'U', ['CAT-006']],
      ]],
      ['Red de acopios', [
        ['Gestionar acopios', 'CRU', ['RED-001']],
        ['Importar acopios externos', 'CU', ['RED-011']],
        ['Gestionar entidades', 'CRU', ['RED-005']],
        ['Verificar entidad', 'U', ['RED-006']],
        ['Gestionar causas', 'CRU', ['RED-007']],
        ['Archivar causa', 'U', ['RED-010']],
      ]],
      ['Contenido y auditoría', [
        ['Gestionar contenido de portada', 'CUD', ['HOM-003']],
        ['Consultar bitácora', 'R', ['IDE-012']],
      ]],
    ],
  },
];

// ── Verificación: cada RF activo aparece una sola vez ─────────────────────
const vistos = new Map();
for (const m of MODULOS) for (const [s, fs] of m.sub) for (const [f, , rfs] of fs)
  for (const r of rfs) {
    if (!RF[r]) throw new Error(`RF desconocido: ${r}`);
    if (vistos.has(r)) throw new Error(`RF repetido: ${r}`);
    vistos.set(r, { modulo: m.nombre, sub: s, func: f });
  }
for (const r of Object.keys(FUERA)) if (vistos.has(r)) throw new Error(`RF fuera y dentro: ${r}`);
const faltan = Object.keys(RF).filter((r) => !vistos.has(r) && !FUERA[r]);
if (faltan.length) throw new Error(`RF sin ubicar: ${faltan.join(', ')}`);

const nSub = MODULOS.reduce((a, m) => a + m.sub.length, 0);
const nFunc = MODULOS.reduce((a, m) => a + m.sub.reduce((b, [, fs]) => b + fs.length, 0), 0);
const nRF = Object.keys(RF).length;
const nDentro = vistos.size;
console.log(`módulos ${MODULOS.length} · submódulos ${nSub} · funcionalidades ${nFunc} · RF ${nRF} (${nDentro} en el diagrama, ${Object.keys(FUERA).length} fuera)`);

// Datos para el Word del Avance 3 (docs/entregas/generar-avance-03.py).
writeFileSync(join(aqui, 'datos.json'), JSON.stringify({ MODULOS, RF, FUERA, totales: { modulos: MODULOS.length, submodulos: nSub, funcionalidades: nFunc, rf: nRF, dentro: nDentro } }, null, 1));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rfTxt = (rfs) => rfs.map((r) => `RF-${r}`).join(' · ');
const nFuncDe = (m) => m.sub.reduce((b, [, fs]) => b + fs.length, 0);

const CRUD = [['C', 'Crear'], ['R', 'Consultar'], ['U', 'Actualizar'], ['D', 'Eliminar']];

// ══════════════════════════════════════════════════════════════════════════
// 1. Página del Artifact
// ══════════════════════════════════════════════════════════════════════════
const chips = (crud) => `<span class="crud" aria-label="Operaciones: ${crud.split('').map((l) => CRUD.find((c) => c[0] === l)[1]).join(', ')}">${crud.split('').map((l) => `<b>${l}</b>`).join('')}</span>`;

const nodoFunc = ([f, crud, rfs]) =>
  `<li><div class="t"><div class="n n-func" data-crud="${crud}"><span class="n-tx">${esc(f)}</span>${chips(crud)}<span class="rf">${rfTxt(rfs)}</span></div></div></li>`;

const arbolModulo = (m) => `
<div class="t">
  <div class="n n-mod">${esc(m.nombre)}</div>
  <ul class="k">${m.sub.map(([s, fs]) => `
    <li><div class="t">
      <div class="n n-sub">${esc(s)}</div>
      <ul class="k">${fs.map(nodoFunc).join('')}</ul>
    </div></li>`).join('')}
  </ul>
</div>`;

const arbolGeneral = `
<div class="t">
  <div class="n n-sis">Acopio</div>
  <ul class="k">${MODULOS.map((m) => `
    <li><div class="t">
      <a class="n n-mod n-link" href="#${m.id}">${esc(m.nombre)}</a>
      <ul class="k">${m.sub.map(([s, fs]) => `<li><div class="t"><div class="n n-sub">${esc(s)} <span class="cuenta">${fs.length}</span></div></div></li>`).join('')}</ul>
    </div></li>`).join('')}
  </ul>
</div>`;

const filasTraza = [];
for (const m of MODULOS) for (const [s, fs] of m.sub) for (const [f, crud, rfs] of fs)
  for (const r of rfs) filasTraza.push(`<tr><td class="c-rf">RF-${r}</td><td>${esc(RF[r])}</td><td>${esc(f)}</td><td>${esc(s)}</td><td>${esc(m.nombre)}</td><td>${chips(crud)}</td></tr>`);
for (const [r, motivo] of Object.entries(FUERA))
  filasTraza.push(`<tr class="fuera"><td class="c-rf">RF-${r}</td><td>${esc(RF[r])}</td><td colspan="3">${esc(motivo)}</td><td><span class="tag">Fuera</span></td></tr>`);

const pagina = `<title>Descomposición funcional de Acopio</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,700&display=swap">
<style>
:root{
  --suelo:#FAFAF9; --superficie:#FFFFFF; --tinta:#1C1917; --tinta-2:#57534E; --tinta-3:#78716C;
  --borde:#E7E5E4; --linea:#A8A29E;
  --sis-f:#0A4F4F; --sis-t:#FFFFFF; --mod-f:#0F6E6E; --mod-t:#FFFFFF; --sub-f:#C7E8E8; --sub-t:#0A4F4F;
  --acento:#0F6E6E; --acento-suave:#E6F4F4; --chip:#D6D3D1; --foco:#14A0A0;
  --g:28px;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --suelo:#141312; --superficie:#1E1C1A; --tinta:#F5F5F4; --tinta-2:#B8B2AD; --tinta-3:#8F8883;
    --borde:#34302D; --linea:#5E5853;
    --sis-f:#14A0A0; --sis-t:#081A1A; --mod-f:#0F6E6E; --mod-t:#FFFFFF; --sub-f:#123736; --sub-t:#C7E8E8;
    --acento:#46C6C6; --acento-suave:#12302F; --chip:#48433F; --foco:#46C6C6;
  }
}
:root[data-theme="dark"]{
  --suelo:#141312; --superficie:#1E1C1A; --tinta:#F5F5F4; --tinta-2:#B8B2AD; --tinta-3:#8F8883;
  --borde:#34302D; --linea:#5E5853;
  --sis-f:#14A0A0; --sis-t:#081A1A; --mod-f:#0F6E6E; --mod-t:#FFFFFF; --sub-f:#123736; --sub-t:#C7E8E8;
  --acento:#46C6C6; --acento-suave:#12302F; --chip:#48433F; --foco:#46C6C6;
}
*{box-sizing:border-box}
body{background:var(--suelo); color:var(--tinta); font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif; font-size:16px; line-height:1.5; margin:0}
.envoltura{max-width:1240px; margin:0 auto; padding-inline:24px; padding-block:48px 64px}
a{color:var(--acento)} a:hover{color:var(--tinta)}
:focus-visible{outline:2px solid var(--foco); outline-offset:2px; border-radius:6px}
h1,h2,h3{text-wrap:balance; margin:0; font-weight:700; letter-spacing:-0.01em}
h1{font-size:36px; line-height:1.15}
h2{font-size:22px; line-height:1.25}
h3{font-size:18px; line-height:1.3}
.ceja{font-size:12px; font-weight:500; letter-spacing:.08em; text-transform:uppercase; color:var(--tinta-3)}
.cabecera{display:grid; gap:16px; max-width:760px}
.lede{font-size:18px; color:var(--tinta-2); max-width:65ch; margin:0}
.cifras{display:flex; flex-wrap:wrap; gap:8px 24px; margin:8px 0 0; padding:0; list-style:none; font-variant-numeric:tabular-nums; color:var(--tinta-2)}
.cifras b{color:var(--tinta); font-size:18px}
.nota{font-size:14px; color:var(--tinta-2); max-width:70ch; margin:0}

/* Barra fija: leyenda y resaltado */
.barra{position:sticky; top:0; z-index:5; background:var(--suelo); border-bottom:1px solid var(--borde); margin-top:32px}
.barra-in{display:flex; flex-wrap:wrap; align-items:center; gap:12px 32px; padding-block:12px}
.leyenda{display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; font-size:14px; color:var(--tinta-2); margin:0; padding:0; list-style:none}
.leyenda li{display:flex; align-items:center; gap:8px}
.mu{width:18px; height:14px; border-radius:4px; display:inline-block; border:1px solid transparent}
.mu-sis{background:var(--sis-f)} .mu-mod{background:var(--mod-f)} .mu-sub{background:var(--sub-f)} .mu-func{background:var(--superficie); border-color:var(--linea)}
.resaltar{display:flex; align-items:center; gap:8px; font-size:14px; color:var(--tinta-2)}
.resaltar button{font:inherit; font-weight:700; font-size:14px; min-width:44px; height:36px; padding:0 10px; border-radius:8px; border:1px solid var(--borde); background:var(--superficie); color:var(--tinta); cursor:pointer; display:inline-flex; align-items:center; gap:6px}
.resaltar button span{font-weight:400; color:var(--tinta-2)}
.resaltar button[aria-pressed="true"]{background:var(--acento); border-color:var(--acento); color:var(--suelo)}
.resaltar button[aria-pressed="true"] span{color:var(--suelo)}

section{margin-top:56px; display:grid; gap:16px}
.sec-cab{display:grid; gap:6px; max-width:760px}
.sec-cab p{margin:0; color:var(--tinta-2)}
.lienzo{background:var(--superficie); border:1px solid var(--borde); border-radius:12px; padding:28px; overflow-x:auto}

/* Árbol de izquierda a derecha, conectores con bordes */
.t{display:flex; align-items:center}
.k{list-style:none; margin:0; padding:0 0 0 var(--g); display:flex; flex-direction:column; position:relative}
.k::before{content:""; position:absolute; left:0; top:50%; width:var(--g); border-top:1.5px solid var(--linea)}
.k > li{position:relative; padding-left:var(--g); padding-block:4px; display:flex; align-items:center}
.k > li::before{content:""; position:absolute; left:0; top:0; bottom:0; border-left:1.5px solid var(--linea)}
.k > li:first-child::before{top:50%}
.k > li:last-child::before{bottom:50%}
.k > li:only-child::before{display:none}
.k > li::after{content:""; position:absolute; left:0; top:50%; width:var(--g); border-top:1.5px solid var(--linea)}
.n{white-space:nowrap; border-radius:10px; padding:8px 14px; font-size:15px; line-height:1.3; flex-shrink:0}
.n-sis{background:var(--sis-f); color:var(--sis-t); font-size:20px; font-weight:700; padding:14px 22px; border-radius:12px}
.n-mod{background:var(--mod-f); color:var(--mod-t); font-weight:700; font-size:16px; padding:10px 16px}
.n-link{text-decoration:none} .n-link:hover{color:var(--mod-t); text-decoration:underline; text-underline-offset:3px}
.n-sub{background:var(--sub-f); color:var(--sub-t); font-weight:500}
.cuenta{font-variant-numeric:tabular-nums; font-size:12px; font-weight:700; margin-left:6px; opacity:.75}
.n-func{background:var(--superficie); border:1px solid var(--linea); color:var(--tinta); display:flex; align-items:center; gap:10px; padding:7px 12px; transition:opacity .15s}
.rf{font-size:12px; color:var(--tinta-3); font-variant-numeric:tabular-nums; letter-spacing:.01em}
.crud{display:inline-flex; gap:2px}
.crud b{display:inline-grid; place-items:center; width:20px; height:20px; border:1px solid var(--chip); border-radius:5px; font-size:11px; font-weight:700; color:var(--tinta-2); background:var(--suelo)}
[data-resaltar] .n-func{opacity:.28}
[data-resaltar="C"] .n-func[data-crud*="C"],[data-resaltar="R"] .n-func[data-crud*="R"],
[data-resaltar="U"] .n-func[data-crud*="U"],[data-resaltar="D"] .n-func[data-crud*="D"]{opacity:1; border-color:var(--acento); box-shadow:inset 0 0 0 1px var(--acento)}

.indice{display:flex; flex-wrap:wrap; gap:8px; margin:0; padding:0; list-style:none}
.indice a{display:inline-flex; align-items:center; gap:8px; min-height:40px; padding:0 14px; border:1px solid var(--borde); border-radius:999px; background:var(--superficie); text-decoration:none; color:var(--tinta); font-size:14px; font-weight:500}
.indice a:hover{border-color:var(--acento); color:var(--acento)}
.indice span{font-variant-numeric:tabular-nums; color:var(--tinta-3); font-weight:400}
.modulo{scroll-margin-top:80px}
.mod-meta{font-size:14px; color:var(--tinta-2); font-variant-numeric:tabular-nums}

/* Trazabilidad */
.herr{display:flex; flex-wrap:wrap; gap:12px; align-items:center}
.herr label{font-size:14px; color:var(--tinta-2)}
.herr input{font:inherit; font-size:16px; height:44px; padding:0 14px; border:1px solid var(--linea); border-radius:10px; background:var(--superficie); color:var(--tinta); width:min(360px,100%)}
.tabla-c{overflow-x:auto; border:1px solid var(--borde); border-radius:12px; background:var(--superficie)}
table{border-collapse:collapse; width:100%; min-width:860px; font-size:14px}
th,td{text-align:left; padding:10px 14px; border-bottom:1px solid var(--borde); vertical-align:top}
th{font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--tinta-3); position:sticky; top:0; background:var(--superficie)}
tr:last-child td{border-bottom:0}
.c-rf{font-variant-numeric:tabular-nums; font-weight:500; white-space:nowrap}
tr.fuera td{color:var(--tinta-2); background:var(--acento-suave)}
.tag{display:inline-block; font-size:12px; font-weight:700; padding:2px 8px; border-radius:6px; border:1px solid var(--linea); color:var(--tinta-2)}
.vacio{padding:16px; color:var(--tinta-2); margin:0}
footer{margin-top:56px; padding-top:20px; border-top:1px solid var(--borde); font-size:14px; color:var(--tinta-2); display:grid; gap:4px}

@media (max-width:640px){
  .envoltura{padding-inline:16px; padding-block:32px 48px}
  h1{font-size:28px}
  .lienzo{padding:18px}
  :root{--g:20px}
}
@media (prefers-reduced-motion:reduce){ .n-func{transition:none} }
</style>

<div class="envoltura" id="raiz">
  <header class="cabecera">
    <span class="ceja">Avance 3 · Arquitectura inicial</span>
    <h1>Descomposición funcional de Acopio</h1>
    <p class="lede">Las funcionalidades de la plataforma de coordinación logística para respuesta a desastres, agrupadas en seis módulos. Cada funcionalidad lleva su operación CRUD y los requerimientos que la originan.</p>
    <ul class="cifras">
      <li><b>${MODULOS.length}</b> módulos</li>
      <li><b>${nSub}</b> submódulos</li>
      <li><b>${nFunc}</b> funcionalidades</li>
      <li><b>${nRF}</b> requerimientos trazados</li>
    </ul>
    <p class="nota">Derivada de los requerimientos funcionales activos y de las historias de usuario semilla. La agrupación en seis módulos sigue la decisión P-010. Cuatro requerimientos quedan fuera del diagrama porque son reglas del sistema, no acciones; aparecen al final de la trazabilidad.</p>
  </header>

  <div class="barra">
    <div class="barra-in">
      <ul class="leyenda" aria-label="Convenciones">
        <li><span class="mu mu-sis"></span>Sistema</li>
        <li><span class="mu mu-mod"></span>Módulo</li>
        <li><span class="mu mu-sub"></span>Submódulo</li>
        <li><span class="mu mu-func"></span>Funcionalidad</li>
      </ul>
      <div class="resaltar" role="group" aria-label="Resaltar funcionalidades por operación">
        <span>Resaltar</span>
        ${CRUD.map(([l, n]) => `<button type="button" id="res-${l}" data-l="${l}" aria-pressed="false">${l} <span>${n}</span></button>`).join('')}
      </div>
    </div>
  </div>

  <section aria-labelledby="t-general">
    <div class="sec-cab">
      <h2 id="t-general">Vista general</h2>
      <p>El sistema, sus seis módulos y los submódulos de cada uno, con el número de funcionalidades que agrupa cada submódulo. Toca un módulo para ir a su detalle.</p>
    </div>
    <div class="lienzo">${arbolGeneral}</div>
  </section>

  <section aria-labelledby="t-modulos">
    <div class="sec-cab">
      <h2 id="t-modulos">Detalle por módulo</h2>
      <p>Un diagrama por módulo: submódulos y funcionalidades con su operación y sus requerimientos.</p>
    </div>
    <ul class="indice">${MODULOS.map((m) => `<li><a href="#${m.id}">${esc(m.nombre)} <span>${nFuncDe(m)}</span></a></li>`).join('')}</ul>
  </section>

  ${MODULOS.map((m) => `
  <section class="modulo" id="${m.id}" aria-labelledby="t-${m.id}">
    <div class="sec-cab">
      <h3 id="t-${m.id}">${esc(m.nombre)}</h3>
      <p class="mod-meta">${esc(m.origen)} · ${m.sub.length} submódulos · ${nFuncDe(m)} funcionalidades</p>
    </div>
    <div class="lienzo">${arbolModulo(m)}</div>
  </section>`).join('')}

  <section aria-labelledby="t-traza">
    <div class="sec-cab">
      <h2 id="t-traza">Trazabilidad</h2>
      <p>Cada requerimiento funcional activo, con la funcionalidad, el submódulo y el módulo donde vive.</p>
    </div>
    <div class="herr">
      <label for="filtro-rf">Buscar</label>
      <input id="filtro-rf" type="search" placeholder="RF-INV-004, conciliar, Turnos…" autocomplete="off">
    </div>
    <div class="tabla-c">
      <table>
        <thead><tr><th scope="col">RF</th><th scope="col">Requerimiento</th><th scope="col">Funcionalidad</th><th scope="col">Submódulo</th><th scope="col">Módulo</th><th scope="col">CRUD</th></tr></thead>
        <tbody id="cuerpo-traza">${filasTraza.join('')}</tbody>
      </table>
      <p class="vacio" id="sin-resultados" hidden>Ningún requerimiento coincide con la búsqueda. Prueba con un número de RF o con el nombre de un módulo.</p>
    </div>
  </section>

  <footer>
    <span>Fuente: requerimientos funcionales de la bóveda del proyecto (docs/01-requerimientos/funcionales) y decisión P-010.</span>
    <span>Actualizado el 14 de septiembre de 2026 · Ingeniería de Software I · ETITC</span>
  </footer>
</div>

<script>
(function(){
  var raiz = document.getElementById('raiz');
  var botones = document.querySelectorAll('.resaltar button');
  botones.forEach(function(b){
    b.addEventListener('click', function(){
      var activo = b.getAttribute('aria-pressed') === 'true';
      botones.forEach(function(o){ o.setAttribute('aria-pressed','false'); });
      if (activo) { raiz.removeAttribute('data-resaltar'); }
      else { b.setAttribute('aria-pressed','true'); raiz.setAttribute('data-resaltar', b.dataset.l); }
    });
  });
  var entrada = document.getElementById('filtro-rf');
  var filas = document.querySelectorAll('#cuerpo-traza tr');
  var vacio = document.getElementById('sin-resultados');
  var norm = function(s){ return s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,''); };
  entrada.addEventListener('input', function(){
    var q = norm(entrada.value.trim());
    var n = 0;
    filas.forEach(function(tr){
      var ok = !q || norm(tr.textContent).indexOf(q) !== -1;
      tr.hidden = !ok; if (ok) n++;
    });
    vacio.hidden = n !== 0;
  });
})();
</script>
`;
writeFileSync(join(aqui, 'descomposicion-funcional.html'), pagina);

// ══════════════════════════════════════════════════════════════════════════
// 2. Artboards del lienzo (estilos en línea para que el editor los ajuste)
// ══════════════════════════════════════════════════════════════════════════
const C = { suelo: '#FAFAF9', sup: '#FFFFFF', tinta: '#1C1917', t2: '#57534E', t3: '#78716C', borde: '#E7E5E4', linea: '#A8A29E', sis: '#0A4F4F', mod: '#0F6E6E', sub: '#C7E8E8', chip: '#D6D3D1' };
const FUENTE = `'Inter', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`;

const helmet = `<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,700&amp;display=swap">
  <style>
    body { margin: 0; background: ${C.suelo}; font-family: ${FUENTE}; color: ${C.tinta}; }
    a { color: ${C.mod}; } a:hover { color: ${C.sis}; }
    .t { display: flex; align-items: center; }
    .k { list-style: none; margin: 0; padding: 0 0 0 32px; display: flex; flex-direction: column; position: relative; }
    .k::before { content: ""; position: absolute; left: 0; top: 50%; width: 32px; border-top: 2px solid ${C.linea}; }
    .k > li { position: relative; padding-left: 32px; padding-block: 5px; display: flex; align-items: center; }
    .k > li::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; border-left: 2px solid ${C.linea}; }
    .k > li:first-child::before { top: 50%; }
    .k > li:last-child::before { bottom: 50%; }
    .k > li:only-child::before { display: none; }
    .k > li::after { content: ""; position: absolute; left: 0; top: 50%; width: 32px; border-top: 2px solid ${C.linea}; }
  </style>
</helmet>`;

const doc = (cuerpo) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
${helmet}
${cuerpo}
</x-dc>
</body>
</html>
`;

const sNodo = 'white-space: nowrap; flex-shrink: 0; line-height: 1.3;';
const nSis = (t) => `<div style="${sNodo} background: ${C.sis}; color: #FFFFFF; font-size: 26px; font-weight: 700; padding: 18px 28px; border-radius: 12px;">${esc(t)}</div>`;
const nMod = (t) => `<div style="${sNodo} background: ${C.mod}; color: #FFFFFF; font-size: 19px; font-weight: 700; padding: 12px 18px; border-radius: 10px;">${esc(t)}</div>`;
const nodoSub = (t, extra = '') => `<div style="${sNodo} background: ${C.sub}; color: ${C.sis}; font-size: 17px; font-weight: 500; padding: 10px 16px; border-radius: 10px;">${esc(t)}${extra}</div>`;
const chipsDc = (crud) => `<div style="display: flex; gap: 3px;">${crud.split('').map((l) => `<span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: 1px solid ${C.chip}; border-radius: 6px; font-size: 13px; font-weight: 700; color: ${C.t2}; background: ${C.suelo};">${l}</span>`).join('')}</div>`;
const nFuncDc = ([f, crud, rfs]) => `<div style="${sNodo} display: flex; align-items: center; gap: 12px; background: ${C.sup}; border: 1px solid ${C.linea}; border-radius: 8px; padding: 8px 14px; font-size: 16px; color: ${C.tinta};"><span>${esc(f)}</span>${chipsDc(crud)}<span style="font-size: 13px; color: ${C.t3}; font-variant-numeric: tabular-nums;">${rfTxt(rfs)}</span></div>`;

const leyendaDc = (compacta) => `
  <div style="display: flex; flex-direction: ${compacta ? 'row' : 'column'}; flex-wrap: wrap; gap: ${compacta ? '10px 24px' : '12px'}; font-size: 15px; color: ${C.t2};">
    ${[['Sistema', `background: ${C.sis};`], ['Módulo', `background: ${C.mod};`], ['Submódulo', `background: ${C.sub};`], ['Funcionalidad', `background: ${C.sup}; border: 1px solid ${C.linea};`]]
      .map(([n, s]) => `<div style="display: flex; align-items: center; gap: 10px;"><span style="display: inline-block; width: 22px; height: 16px; border-radius: 4px; ${s}"></span><span>${n}</span></div>`).join('')}
    ${CRUD.map(([l, n]) => `<div style="display: flex; align-items: center; gap: 10px;">${chipsDc(l)}<span>${n}</span></div>`).join('')}
  </div>`;

const ALTO_FILA = 56;
const artboards = [];

// Vista general (Main)
{
  const filas = nSub;
  const h = Math.ceil((96 + 150 + filas * ALTO_FILA + 40) * 1.08);
  const arbol = `<div class="t">${nSis('Acopio')}<ul class="k">${MODULOS.map((m) => `<li><div class="t">${nMod(m.nombre)}<ul class="k">${m.sub.map(([s, fs]) => `<li>${nodoSub(s, `<span style="font-size: 13px; font-weight: 700; margin-left: 8px; opacity: 0.7;">${fs.length}</span>`)}</li>`).join('')}</ul></div></li>`).join('')}</ul></div>`;
  const cuerpo = `<div style="width: 1320px; min-height: ${h}px; box-sizing: border-box; padding: 48px; background: ${C.suelo}; display: flex; flex-direction: column; gap: 32px;">
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="font-size: 13px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.t3};">Avance 3 · Arquitectura inicial</div>
    <div style="font-size: 34px; font-weight: 700; letter-spacing: -0.01em; color: ${C.tinta};">Acopio: vista de descomposición funcional</div>
  </div>
  <div style="display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 48px; align-items: start;">
    ${arbol}
    <div style="display: flex; flex-direction: column; gap: 24px; border-left: 1px solid ${C.borde}; padding-left: 28px;">
      <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.t3};">Convenciones</div>
      ${leyendaDc(false)}
      <div style="font-size: 15px; line-height: 1.5; color: ${C.t2}; font-variant-numeric: tabular-nums;">${MODULOS.length} módulos · ${nSub} submódulos · ${nFunc} funcionalidades · ${nRF} RF trazados. El número en cada submódulo es su cantidad de funcionalidades.</div>
    </div>
  </div>
</div>`;
  artboards.push({ file: 'Main.dc.html', title: 'Vista general', w: 1320, h, src: doc(cuerpo) });
}

// Un artboard por módulo
for (const m of MODULOS) {
  const filas = nFuncDe(m);
  const h = Math.ceil((96 + 130 + filas * ALTO_FILA + 90) * 1.08);
  const arbol = `<div class="t">${nMod(m.nombre)}<ul class="k">${m.sub.map(([s, fs]) => `<li><div class="t">${nodoSub(s)}<ul class="k">${fs.map((f) => `<li>${nFuncDc(f)}</li>`).join('')}</ul></div></li>`).join('')}</ul></div>`;
  const cuerpo = `<div style="width: 1320px; min-height: ${h}px; box-sizing: border-box; padding: 48px; background: ${C.suelo}; display: flex; flex-direction: column; gap: 28px;">
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="font-size: 13px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.t3};">Acopio · descomposición funcional</div>
    <div style="font-size: 30px; font-weight: 700; letter-spacing: -0.01em; color: ${C.tinta};">${esc(m.nombre)}</div>
    <div style="font-size: 15px; color: ${C.t2}; font-variant-numeric: tabular-nums;">${esc(m.origen)} · ${m.sub.length} submódulos · ${filas} funcionalidades</div>
  </div>
  ${arbol}
  <div style="border-top: 1px solid ${C.borde}; padding-top: 18px;">${leyendaDc(true)}</div>
</div>`;
  artboards.push({ file: `${m.archivo}.dc.html`, title: m.nombre, w: 1320, h, src: doc(cuerpo) });
}

// Trazabilidad
{
  const celda = `padding: 10px 14px; border-bottom: 1px solid ${C.borde}; text-align: left; vertical-align: top;`;
  const filas = [];
  for (const m of MODULOS) for (const [s, fs] of m.sub) for (const [f, crud, rfs] of fs)
    for (const r of rfs) filas.push(`<tr><td style="${celda} font-weight: 500; white-space: nowrap; font-variant-numeric: tabular-nums;">RF-${r}</td><td style="${celda}">${esc(RF[r])}</td><td style="${celda}">${esc(f)}</td><td style="${celda}">${esc(s)}</td><td style="${celda}">${esc(m.nombre)}</td><td style="${celda}">${chipsDc(crud)}</td></tr>`);
  for (const [r, motivo] of Object.entries(FUERA))
    filas.push(`<tr style="background: #E6F4F4;"><td style="${celda} font-weight: 500; white-space: nowrap;">RF-${r}</td><td style="${celda}">${esc(RF[r])}</td><td style="${celda} color: ${C.t2};" colspan="3">${esc(motivo)}</td><td style="${celda} color: ${C.t2}; font-weight: 700;">Fuera</td></tr>`);
  const h = Math.ceil((96 + 140 + (filas.length + 1) * 45) * 1.08);
  const th = `padding: 10px 14px; border-bottom: 2px solid ${C.linea}; text-align: left; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${C.t3};`;
  const cuerpo = `<div style="width: 1320px; min-height: ${h}px; box-sizing: border-box; padding: 48px; background: ${C.suelo}; display: flex; flex-direction: column; gap: 24px;">
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="font-size: 13px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: ${C.t3};">Acopio · descomposición funcional</div>
    <div style="font-size: 30px; font-weight: 700; color: ${C.tinta};">Trazabilidad de requerimientos</div>
    <div style="font-size: 15px; color: ${C.t2};">Cada RF activo con la funcionalidad, el submódulo y el módulo donde vive. Al final, los cuatro que quedan fuera del diagrama por ser reglas del sistema.</div>
  </div>
  <table style="border-collapse: collapse; width: 100%; font-size: 15px; background: ${C.sup}; border: 1px solid ${C.borde};">
    <thead><tr><th style="${th}">RF</th><th style="${th}">Requerimiento</th><th style="${th}">Funcionalidad</th><th style="${th}">Submódulo</th><th style="${th}">Módulo</th><th style="${th}">CRUD</th></tr></thead>
    <tbody>${filas.join('')}</tbody>
  </table>
</div>`;
  artboards.push({ file: 'Trazabilidad.dc.html', title: 'Trazabilidad de requerimientos', w: 1320, h, src: doc(cuerpo) });
}

// Disposición: vista general arriba a la izquierda, trazabilidad a su derecha,
// módulos en dos filas de tres debajo de la vista general.
const dirLienzo = join(aqui, 'canvas');
mkdirSync(dirLienzo, { recursive: true });
for (const a of artboards) writeFileSync(join(dirLienzo, a.file), a.src);

const main = artboards[0];
const mods = artboards.slice(1, 7);
const traza = artboards[7];
const PASO_X = 1400;
const fila1Y = main.h + 200;
const fila1H = Math.max(...mods.slice(0, 3).map((a) => a.h));
const fila2Y = fila1Y + fila1H + 200;
const layout = [
  { file: main.file, title: main.title, x: 0, y: 0, w: main.w, h: main.h },
  ...mods.map((a, i) => ({ file: a.file, title: a.title, x: (i % 3) * PASO_X, y: i < 3 ? fila1Y : fila2Y, w: a.w, h: a.h })),
  { file: traza.file, title: traza.title, x: 3 * PASO_X, y: 0, w: traza.w, h: traza.h },
];
const canvas = {
  artboards: layout,
  annotations: [
    { id: 'nota-origen', x: 0, y: -260, w: 760, text: `Descomposición funcional del Avance 3. Derivada de los ${nRF} RF activos y las historias semilla; la agrupación en seis módulos sigue P-010. El Avance 2 (épicas) no existe, ver P-012.\n\nCuatro RF quedan fuera del diagrama porque son reglas del sistema, no acciones: IDE-005, INV-011, CMP-002 y TUR-006. Están al final de la trazabilidad.\n\nColores: teal de marca por nivel. El semáforo queda reservado (ADR-0006), por eso las letras CRUD van en neutro.\n\nPara el Word: exportar cada artboard como PNG. Fuente de verdad: build.mjs en docs/03-diseno/descomposicion-funcional/.` },
  ],
  launch: { view: 'canvas' },
};
writeFileSync(join(dirLienzo, 'canvas.json'), JSON.stringify(canvas, null, 2));
console.log('artboards:', artboards.map((a) => `${a.file} ${a.w}x${a.h}`).join(' | '));
