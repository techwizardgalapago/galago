import "@testing-library/jest-native/extend-expect";

// Mock para NetInfo
jest.mock("@react-native-community/netinfo", () =>
  require("@react-native-community/netinfo/jest/netinfo-mock.js")
);

// Mock para Expo Router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: ({ children, href }) => children,
}));

// Mock para Expo Constants
jest.mock("expo-constants", () => ({
  expoConfig: {
    name: "test-app",
    slug: "test-app",
  },
}));

// Mock completo para expo-sqlite
jest.mock("expo-sqlite", () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    readTransaction: jest.fn(),
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    // Agregar método close para limpiar recursos
    close: jest.fn(),
  })),
  openDatabaseAsync: jest.fn(),
}));

// Para tests que requieren base de datos real
global.setupTestDatabase = async () => {
  const SQLite = require("expo-sqlite");
  return SQLite.openDatabase(":memory:");
};

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && args[0].includes("expo-sqlite")) {
    return;
  }
  originalWarn(...args);
};

// Configuración global para tests
global.__DEV__ = true;
