/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/**/src/**/*.ts',
    'libs/**/src/**/*.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/index.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.controller.ts',
    '!**/rabbitmq.service.ts',
    '!**/email.service.ts',
    '!**/template.service.ts',
    '!**/services/*.ts',
    '!**/repositories/*.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testEnvironment: 'node',
  projects: [
    '<rootDir>/apps/user-service',
    '<rootDir>/apps/payment-service',
    '<rootDir>/apps/auth-service',
    '<rootDir>/apps/notification-service',
    '<rootDir>/apps/api-gateway',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleNameMapper: {
    '^@app/common(.*)$': '<rootDir>/libs/common/src$1',
    '^@app/proto(.*)$': '<rootDir>/libs/proto/src$1',
    '^@app/prisma(.*)$': '<rootDir>/libs/prisma/src$1',
    '^@app/logging(.*)$': '<rootDir>/libs/logging/src$1',
  },
};
