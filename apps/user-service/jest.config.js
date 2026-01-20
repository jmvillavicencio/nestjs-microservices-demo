/** @type {import('jest').Config} */
module.exports = {
  displayName: 'user-service',
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
  coverageDirectory: '../../coverage/user-service',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/common(.*)$': '<rootDir>/../../libs/common/src$1',
    '^@app/proto(.*)$': '<rootDir>/../../libs/proto/src$1',
    '^@app/prisma(.*)$': '<rootDir>/../../libs/prisma/src$1',
  },
};
