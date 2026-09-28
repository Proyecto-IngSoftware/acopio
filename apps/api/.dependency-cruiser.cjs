/**
 * Límites entre módulos (D-02 del Bloque 0, RNF-13). Traduce la tabla «Dependencias
 * permitidas» de docs/02-arquitectura/vista-general.md: quién puede importar a
 * quién. Todo lo demás está prohibido. `comun`, `config` y `generado` no son
 * módulos de dominio y los usa cualquiera.
 */
const TODOS = [
  'identidad',
  'auditoria',
  'notificaciones',
  'almacenamiento',
  'catalogo',
  'acopios',
  'inventario',
  'comprobantes',
  'motor',
  'turnos',
  'importacion',
  'salud',
];

/** módulo → módulos que lo pueden importar */
const PERMITIDOS = {
  identidad: TODOS,
  auditoria: TODOS,
  notificaciones: ['identidad', 'acopios', 'comprobantes', 'turnos'],
  almacenamiento: ['acopios', 'comprobantes', 'motor'],
  catalogo: ['inventario', 'motor'],
  acopios: ['inventario', 'comprobantes', 'motor', 'turnos', 'importacion'],
  inventario: ['comprobantes', 'motor'],
  comprobantes: ['motor'],
  motor: [],
  turnos: [],
  importacion: [],
  salud: [],
};

const reglasDeModulo = Object.entries(PERMITIDOS).map(([destino, quienes]) => {
  const prohibidos = TODOS.filter((m) => m !== destino && !quienes.includes(m));
  return {
    name: `solo-importan-${destino}`,
    severity: 'error',
    comment: `${destino} solo lo pueden importar: ${quienes.join(', ') || 'nadie'}`,
    from: { path: `^src/modulos/(${prohibidos.join('|')})/` },
    to: { path: `^src/modulos/${destino}/` },
  };
});

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'sin-ciclos',
      severity: 'error',
      comment: 'Sin dependencias circulares (RNF-13)',
      from: { path: '^src/' },
      to: { circular: true, viaOnly: { pathNot: '^src/generado/' } },
    },
    {
      name: 'comun-no-depende-de-modulos',
      severity: 'error',
      comment: 'comun y config son la base: no importan módulos de dominio',
      from: { path: '^src/(comun|config)/' },
      to: { path: '^src/modulos/' },
    },
    ...reglasDeModulo,
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['^src/generado/', '\\.test\\.ts$'] },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
