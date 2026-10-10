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

/** Módulos cuyo acceso a datos ya pasa por DAO (ADR-0019). Los demás se migran al tocarlos. */
const MIGRADOS_A_DAO = ['inventario', 'comprobantes', 'motor', 'salud'];

/** módulo → módulos que lo pueden importar */
const PERMITIDOS = {
  identidad: TODOS,
  auditoria: TODOS,
  notificaciones: ['identidad', 'acopios', 'comprobantes', 'turnos'],
  almacenamiento: ['acopios', 'comprobantes', 'motor'],
  catalogo: ['inventario', 'comprobantes', 'motor'],
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
    {
      name: 'controladores-sin-acceso-a-datos',
      severity: 'error',
      comment:
        'Un controlador llama servicios, no Prisma ni los DAO (ADR-0019). salud solo pregunta si la base responde',
      from: { path: '\\.controller\\.ts$', pathNot: '^src/modulos/salud/' },
      to: { path: ['^src/comun/prisma/prisma\\.service\\.ts$', '\\.dao\\.ts$'] },
    },
    {
      name: 'acceso-a-datos-por-dao',
      severity: 'error',
      comment:
        'En los módulos migrados solo los DAO usan PrismaService; los servicios abren la transacción con Transacciones (ADR-0019)',
      from: { path: `^src/modulos/(${MIGRADOS_A_DAO.join('|')})/`, pathNot: '\\.dao\\.ts$' },
      to: { path: '^src/comun/prisma/prisma\\.service\\.ts$' },
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
