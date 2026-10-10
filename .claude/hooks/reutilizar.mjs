// Hook de Claude Code para no duplicar código (docs/02-arquitectura/patrones-y-practicas.md).
//   PreToolUse(Write), archivo nuevo en apps/*/src o packages/*/src: busca en el repo los
//     nombres que exporta el contenido y suma el catálogo de reutilizables de su zona.
//   PostToolUse(Write) en una carpeta de piezas reutilizables: si el catálogo no nombra el
//     archivo, recuerda agregarlo.
// Solo avisa; nunca bloquea. Ante cualquier error sale sin decir nada.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const NOTA = 'docs/02-arquitectura/patrones-y-practicas.md';

const ZONAS = [
  { prefijo: 'apps/api/src/', seccion: 'API' },
  { prefijo: 'apps/web/src/', seccion: 'Web' },
  { prefijo: 'packages/shared/src/', seccion: 'Compartido' },
];

// Lo que cae aquí es reutilizable por definición y va al catálogo
const CARPETAS_DEL_CATALOGO = [
  'apps/api/src/comun/',
  'packages/shared/src/',
  'apps/web/src/componentes/',
  'apps/web/src/pruebas/',
];

const IGNORADOS = [/\.test\.tsx?$/, /\/generado\//, /esquema\.d\.ts$/, /\/pruebas-integracion\//];

const EXPORTACION =
  /^export\s+(?:default\s+)?(?:async\s+)?(?:abstract\s+)?(?:function\*?|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;

function responder(evento, texto) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: evento, additionalContext: texto } }),
  );
}

/** Texto de la nota bajo `### <titulo>` dentro de la sección del catálogo. */
function seccionDelCatalogo(raiz, titulo) {
  const ruta = path.join(raiz, NOTA);
  if (!existsSync(ruta)) return null;
  const completa = readFileSync(ruta, 'utf8');
  const nota = completa.slice(Math.max(0, completa.indexOf('\n## Catálogo')));
  const inicio = nota.indexOf(`\n### ${titulo}\n`);
  if (inicio === -1) return null;
  const resto = nota.slice(inicio + 1);
  const fin = resto.slice(4).search(/\n#{2,3} /);
  return fin === -1 ? resto : resto.slice(0, fin + 4);
}

/** Dónde ya se exporta cada nombre, según los archivos versionados. */
function exportacionesExistentes(raiz, nombres, propio) {
  const patrones = nombres.flatMap((n) => [
    '-e',
    // ERE de git grep no tiene \b: el nombre termina donde no sigue un carácter de identificador
    `^export .*(function\\*?|const|let|class|interface|type|enum) ${n.replace(/\$/g, '\\$')}([^A-Za-z0-9_$]|$)`,
  ]);
  let salida;
  try {
    salida = execFileSync(
      'git',
      [
        'grep',
        '-nE',
        ...patrones,
        '--',
        'apps/*/src/*',
        'packages/*/src/*',
        ':(exclude,glob)**/generado/**',
      ],
      { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch {
    return []; // git grep sale con 1 cuando no encuentra nada
  }
  return salida
    .split('\n')
    .filter(Boolean)
    .filter((linea) => !linea.startsWith(`${propio}:`))
    .map((linea) => {
      const [archivo, numero] = linea.split(':');
      const nombre = nombres.find((n) =>
        new RegExp(`\\b${n}\\b`).test(linea.slice(archivo.length)),
      );
      return `- \`${nombre}\` ya existe en \`${archivo}:${numero}\``;
    });
}

function antesDeEscribir(raiz, relativa, contenido) {
  if (existsSync(path.join(raiz, relativa))) return; // reescribir no es crear
  const zona = ZONAS.find((z) => relativa.startsWith(z.prefijo));
  if (!zona) return;

  const nombres = [...new Set([...contenido.matchAll(EXPORTACION)].map((m) => m[1]))];
  const duplicados = nombres.length ? exportacionesExistentes(raiz, nombres, relativa) : [];
  const catalogo = seccionDelCatalogo(raiz, zona.seccion);

  const partes = [`Vas a crear \`${relativa}\`.`];
  if (duplicados.length) {
    partes.push(
      'Estos nombres ya se exportan en otro archivo. Reutiliza lo que hay o justifica el archivo nuevo:',
      ...duplicados,
    );
  }
  partes.push(
    catalogo
      ? `Antes de escribir código nuevo, revisa lo reutilizable de esta zona (${NOTA}):\n${catalogo.trim()}`
      : `Antes de escribir código nuevo, revisa el catálogo de reutilizables en ${NOTA}.`,
  );
  responder('PreToolUse', partes.join('\n'));
}

function despuesDeEscribir(raiz, relativa) {
  if (!CARPETAS_DEL_CATALOGO.some((c) => relativa.startsWith(c))) return;
  const ruta = path.join(raiz, NOTA);
  if (!existsSync(ruta)) return;
  const nombre = path.basename(relativa).replace(/\.(tsx?|mjs)$/, '');
  if (new RegExp(`\\b${nombre}\\b`).test(readFileSync(ruta, 'utf8'))) return;
  responder(
    'PostToolUse',
    `\`${relativa}\` es una pieza reutilizable y el catálogo de ${NOTA} no la nombra. ` +
      'Agrégala en la sección de su zona, con una línea sobre qué ofrece.',
  );
}

try {
  const datos = JSON.parse(readFileSync(0, 'utf8'));
  const raiz = process.env.CLAUDE_PROJECT_DIR || datos.cwd || process.cwd();
  const archivo = datos.tool_input?.file_path;
  if (typeof archivo !== 'string') process.exit(0);
  const relativa = path.relative(raiz, path.resolve(raiz, archivo)).split(path.sep).join('/');
  if (relativa.startsWith('..') || !/\.(tsx?|mjs)$/.test(relativa)) process.exit(0);
  if (IGNORADOS.some((r) => r.test(relativa))) process.exit(0);

  if (datos.hook_event_name === 'PostToolUse') despuesDeEscribir(raiz, relativa);
  else antesDeEscribir(raiz, relativa, String(datos.tool_input?.content ?? ''));
} catch {
  process.exit(0);
}
