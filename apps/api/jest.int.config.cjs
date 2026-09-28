/** Pruebas de integración: contra un PostgreSQL real (DATABASE_URL_OWNER). */
const base = require('./jest.config.cjs');

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '\\.int\\.test\\.ts$',
  transform: base.transform,
  moduleNameMapper: base.moduleNameMapper,
  globalSetup: '<rootDir>/test/preparar-base.ts',
  testTimeout: 20000,
};
