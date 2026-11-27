/** Pruebas de integración: contra un PostgreSQL real (DATABASE_URL_OWNER). */
const base = require('./jest.config.cjs');

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '\\.int\\.test\\.ts$',
  reporters: base.reporters.map((r) =>
    Array.isArray(r) ? [r[0], { ...r[1], outputName: 'api-integracion.xml' }] : r,
  ),
  transform: base.transform,
  moduleNameMapper: base.moduleNameMapper,
  globalSetup: '<rootDir>/test/preparar-base.ts',
  testTimeout: 20000,
};
