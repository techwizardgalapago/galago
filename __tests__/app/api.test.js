import { Platform } from "react-native";
import {
  api,
  API_URL,
  buildApiUrl,
  setAuthHeader,
  setUnauthorizedHandler,
} from "../../src/services/api";
import { authStorage } from "../../src/utils/authStorage";

jest.mock("../../src/utils/authStorage", () => ({
  authStorage: {
    getToken: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn().mockResolvedValue(undefined),
  },
}));

// Dispara a mano el handler de error del interceptor, sin red.
const triggerResponseError = (error) => {
  const handlers = api.interceptors.response.handlers.filter(Boolean);
  const rejected = handlers[handlers.length - 1].rejected;
  return rejected(error).catch((e) => e);
};

const httpError = (status, url) => ({
  response: { status },
  config: { url },
});

afterEach(() => {
  jest.clearAllMocks();
  setUnauthorizedHandler(null);
  setAuthHeader(null);
});

describe("buildApiUrl", () => {
  it("no duplica la barra entre base y path", () => {
    expect(buildApiUrl("auth/google-login")).toBe(
      `${API_URL.replace(/\/+$/, "")}/auth/google-login`
    );
    expect(buildApiUrl("/auth/google-login")).toBe(
      buildApiUrl("auth/google-login")
    );
    expect(buildApiUrl("auth/google-login")).not.toMatch(/\/\/auth/);
  });

  it("devuelve una URL absoluta aunque no le pasen path", () => {
    expect(buildApiUrl()).toMatch(/^https?:\/\//);
  });

  it("siempre resuelve a http(s), nunca a 'undefined/...'", () => {
    // EXPO_PUBLIC_API_URL se inlinea en build: si falta, debe caer al default.
    expect(API_URL).toMatch(/^https?:\/\//);
    expect(buildApiUrl("venues")).not.toMatch(/undefined/);
  });
});

describe("setAuthHeader", () => {
  it("pone y quita el header Authorization", () => {
    setAuthHeader("t0k3n");
    expect(api.defaults.headers.common.Authorization).toBe("Bearer t0k3n");

    setAuthHeader(null);
    expect(api.defaults.headers.common.Authorization).toBeUndefined();
  });
});

describe(`interceptor 401 en ${Platform.OS}`, () => {
  it("cierra sesion cuando expira el token", async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAuthHeader("viejo");

    await triggerResponseError(httpError(401, "/venues"));

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(authStorage.clearToken).toHaveBeenCalledTimes(1);
    expect(api.defaults.headers.common.Authorization).toBeUndefined();
  });

  it.each(["auth/login", "auth/sign-up", "auth/google-login"])(
    "no cierra sesion si el 401 viene de %s",
    async (endpoint) => {
      const onUnauthorized = jest.fn();
      setUnauthorizedHandler(onUnauthorized);
      setAuthHeader("vigente");

      await triggerResponseError(httpError(401, endpoint));

      // Credenciales malas: la sesion actual no se toca.
      expect(onUnauthorized).not.toHaveBeenCalled();
      expect(authStorage.clearToken).not.toHaveBeenCalled();
      expect(api.defaults.headers.common.Authorization).toBe("Bearer vigente");
    }
  );

  it.each([403, 404, 500])("ignora el status %i", async (status) => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    await triggerResponseError(httpError(status, "/venues"));

    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(authStorage.clearToken).not.toHaveBeenCalled();
  });

  it("sigue rechazando el error para que el llamador lo maneje", async () => {
    const error = httpError(401, "/venues");
    await expect(
      api.interceptors.response.handlers
        .filter(Boolean)
        .slice(-1)[0]
        .rejected(error)
    ).rejects.toBe(error);
  });

  it("no explota si no hay handler registrado", async () => {
    setUnauthorizedHandler(null);
    await expect(triggerResponseError(httpError(401, "/venues"))).resolves.toBeDefined();
    expect(authStorage.clearToken).toHaveBeenCalledTimes(1);
  });

  it("tolera errores de red sin response", async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    await triggerResponseError({ message: "Network Error" });

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
