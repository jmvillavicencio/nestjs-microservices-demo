/** @type {import('jest').Config} */
module.exports = {
  displayName: 'notification-service',
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
    '!src/email.service.ts',
    '!src/template.service.ts',
  ],
  coverageDirectory: '../../coverage/notification-service',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/common(.*)$': '<rootDir>/../../libs/common/src$1',
    '^@app/proto(.*)$': '<rootDir>/../../libs/proto/src$1',
  },
};
