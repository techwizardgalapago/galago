// Config aparte a proposito: estas pruebas salen a la red y NO deben correr
// con `npm test`. Se lanzan solo con `npm run test:contract`.
module.exports = {
  displayName: "contract",
  testEnvironment: "node",
  testMatch: ["<rootDir>/__tests__/contract/**/*.test.js"],
  testTimeout: 60000,
  maxWorkers: 1,
};
