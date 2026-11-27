/** Pruebas unitarias: sin base de datos. */
const swc = [
  '@swc/jest',
  {
    jsc: {
      parser: { syntax: 'typescript', decorators: true },
      transform: { legacyDecorator: true, decoratorMetadata: true },
    },
    module: { type: 'commonjs' },
  },
];

/** En CI cada suite deja su JUnit en reportes/ de la raíz, que el workflow sube como evidencia. */
const reportes = (/** @type {string} */ nombre) =>
  process.env.CI
    ? [
        'default',
        ['jest-junit', { outputDirectory: '<rootDir>/../../reportes', outputName: nombre }],
      ]
    : ['default'];

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '(?<!\\.int)\\.test\\.ts$',
  reporters: reportes('api-unitarias.xml'),
  transform: { '^.+\\.ts$': swc },
  // El cliente de Prisma importa con .js; Jest resuelve el .ts
  moduleNameMapper: {
    // El paquete publica ESM en dist; Jest (CommonJS) usa el código fuente
    '^@acopio/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
