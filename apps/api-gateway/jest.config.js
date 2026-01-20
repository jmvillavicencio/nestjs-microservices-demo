/** @type {import('jest').Config} */
module.exports = {
  displayName: 'api-gateway',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts'],
  coverageDirectory: '../../coverage/api-gateway',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@app/common(.*)$': '<rootDir>/../../libs/common/src$1',
    '^@app/proto(.*)$': '<rootDir>/../../libs/proto/src$1',
  },
};
