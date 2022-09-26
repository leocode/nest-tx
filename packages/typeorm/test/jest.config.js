process.env = Object.assign(process.env, {
  DISABLE_LOGGER: "true",
});

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '../src'
  ],
  testRegex: '\\.spec\\.ts$',
  globalSetup: './globalSetup.ts'
};
