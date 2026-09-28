/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // SWC solo quita los tipos; la verificación de tipos la hace `typecheck`
  transform: {
    '^.+\\.ts$': ['@swc/jest', { module: { type: 'commonjs' } }],
  },
  // Las importaciones relativas llevan .js por NodeNext; Jest resuelve el .ts
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};
