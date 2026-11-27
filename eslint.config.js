// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*", "src/debug/*"],
  },
  {
    // Reglas que cazan la clase de bug que hemos venido arreglando a mano:
    // variables no definidas, imports olvidados, dependencias de hooks.
    rules: {
      "no-undef": "error",
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // Lo de scripts/ y __mocks__/ no se empaqueta: corre en node, a mano o
    // desde jest, y usa sus globales.
    files: ["scripts/**/*.{js,mjs}", "__mocks__/**/*.js"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        process: "readonly",
        console: "readonly",
        module: "writable",
        require: "readonly",
        __dirname: "readonly",
      },
    },
  },
  {
    files: ["__tests__/**/*.js"],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
  },
];
