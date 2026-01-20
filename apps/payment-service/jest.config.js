/** @type {import('jest').Config} */
module.exports = {
  displayName: 'payment-service',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.controller.ts',
    '!src/rabbitmq.service.ts',
  ],
  coverageDirectory: '../../coverage/payment-service',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/common(.*)$': '<rootDir>/../../libs/common/src$1',
    '^@app/proto(.*)$': '<rootDir>/../../libs/proto/src$1',
    '^@app/prisma(.*)$': '<rootDir>/../../libs/prisma/src$1',
  },
};
