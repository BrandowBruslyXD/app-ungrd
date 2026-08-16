// Configuración de Jest para el backend (NestJS + TypeScript CommonJS).
// Los specs viven junto al código que prueban: src/<módulo>/<archivo>.spec.ts.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
};
