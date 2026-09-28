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

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '(?<!\\.int)\\.test\\.ts$',
  transform: { '^.+\\.ts$': swc },
  // El cliente de Prisma importa con .js; Jest resuelve el .ts
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};
