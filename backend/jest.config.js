/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@shiftwise/dates$': '<rootDir>/../../packages/dates/src/index.ts',
  },
  clearMocks: true,
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/tests/**',
    '!index.ts',
  ],
}

module.exports = config
