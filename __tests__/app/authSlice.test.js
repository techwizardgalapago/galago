import { Platform } from "react-native";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, {
  hydrateAuth,
  login,
  register,
  logout,
  setToken,
  setAuthUserPatch,
  toggleFavorite,
} from "../../src/store/slices/authSlice";
import { authStorage } from "../../src/utils/authStorage";
import { setAuthHeader } from "../../src/services/api";
import * as authService from "../../src/services/authService";
import * as usersService from "../../src/services/usersService";

jest.mock("../../src/utils/authStorage", () => ({
  authStorage: {
    getToken: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn(),
    getUser: jest.fn(),
    setUser: jest.fn(),
    clearUser: jest.fn(),
  },
}));
jest.mock("../../src/services/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
  API_URL: "https://api.galago.ec/api/v1/",
  buildApiUrl: (p = "") => `https://api.galago.ec/api/v1/${p}`,
  setAuthHeader: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));
jest.mock("../../src/services/authService");
jest.mock("../../src/services/usersService");
jest.mock("../../src/store/slices/venueSlice", () => ({
  upsertVenueLocal: jest.fn(() => ({ type: "venues/upsertVenueLocal" })),
}));

const makeStore = (preloadedState) =>
  configureStore({ reducer: { auth: authReducer }, preloadedState });

beforeEach(() => {
  jest.clearAllMocks();
});

describe(`authSlice en ${Platform.OS}`, () => {
  describe("hydrateAuth", () => {
    it("recupera el token guardado y arma el header", async () => {
      authStorage.getToken.mockResolvedValue("guardado");
      authStorage.getUser.mockResolvedValue(null);

      const store = makeStore();
      await store.dispatch(hydrateAuth());

      const { token, hydrated } = store.getState().auth;
      expect(token).toBe("guardado");
      expect(hydrated).toBe(true);
      expect(setAuthHeader).toHaveBeenCalledWith("guardado");
    });

    it("marca hydrated aunque no haya token, para no bloquear el arranque", async () => {
      authStorage.getToken.mockResolvedValue(null);
      authStorage.getUser.mockResolvedValue(null);

      const store = makeStore();
      await store.dispatch(hydrateAuth());

      const { token, hydrated } = store.getState().auth;
      expect(token).toBeNull();
      expect(hydrated).toBe(true);
      expect(setAuthHeader).not.toHaveBeenCalled();
    });

    it("marca hydrated incluso si el storage falla", async () => {
      authStorage.getToken.mockRejectedValue(new Error("storage roto"));
      authStorage.getUser.mockResolvedValue(null);

      const store = makeStore();
      await store.dispatch(hydrateAuth());

      expect(store.getState().auth.hydrated).toBe(true);
    });
  });

  describe("perfil sin conexion", () => {
    it("restaura el usuario guardado, sin pedirlo a la red", async () => {
      // /auth/me es una llamada de red: sin conexion nunca responde, y antes
      // el perfil se quedaba vacio.
      authStorage.getToken.mockResolvedValue("t");
      authStorage.getUser.mockResolvedValue({ userID: "u1", firstName: "Ana" });

      const store = makeStore();
      await store.dispatch(hydrateAuth());

      expect(store.getState().auth.user).toEqual({ userID: "u1", firstName: "Ana" });
    });

    it("no restaura perfil si no hay token", async () => {
      authStorage.getToken.mockResolvedValue(null);
      authStorage.getUser.mockResolvedValue({ userID: "u1" });

      const store = makeStore();
      await store.dispatch(hydrateAuth());

      expect(store.getState().auth.user).toBeNull();
      expect(authStorage.getUser).not.toHaveBeenCalled();
    });

    it("guarda el perfil al iniciar sesion", async () => {
      authService.loginService.mockResolvedValue({
        token: "t",
        fields: [{ userID: "u1", firstName: "Ana" }],
      });

      const store = makeStore();
      await store.dispatch(login({ email: "a@b.c", password: "x" }));

      expect(authStorage.setUser).toHaveBeenCalledWith({ userID: "u1", firstName: "Ana" });
    });

    it("guarda tambien los cambios de favoritos", async () => {
      usersService.patchUserProfile.mockResolvedValue({});
      const store = makeStore({
        auth: { user: { userID: "u1", favoriteEvents: [] }, token: "t", status: "idle", error: null, hydrated: true },
      });

      await store.dispatch(toggleFavorite({ type: "event", id: "recE1" }));

      expect(authStorage.setUser).toHaveBeenCalledWith(
        expect.objectContaining({ favoriteEvents: ["recE1"] })
      );
    });

    it("olvida el perfil al cerrar sesion", () => {
      const store = makeStore({
        auth: { user: { userID: "u1" }, token: "t", status: "idle", error: null, hydrated: true },
      });
      store.dispatch(logout());
      expect(authStorage.clearUser).toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("guarda token y usuario tomando el primero de fields", async () => {
      authService.loginService.mockResolvedValue({
        token: "nuevo",
        fields: [{ userID: "u1", firstName: "Ana" }],
      });

      const store = makeStore();
      await store.dispatch(login({ email: "a@b.c", password: "x" }));

      const { token, user, status } = store.getState().auth;
      expect(status).toBe("succeeded");
      expect(token).toBe("nuevo");
      expect(user).toEqual({ userID: "u1", firstName: "Ana" });
    });

    it("registra el error sin dejar sesion a medias", async () => {
      authService.loginService.mockRejectedValue(new Error("Credenciales"));

      const store = makeStore();
      await store.dispatch(login({ email: "a@b.c", password: "mala" }));

      const { status, error, token, user } = store.getState().auth;
      expect(status).toBe("failed");
      expect(error).toBe("Credenciales");
      expect(token).toBeNull();
      expect(user).toBeNull();
    });
  });

  describe("register", () => {
    it("normaliza fields[0] a user, igual que login", async () => {
      // /auth/sign-up responde { fields, token }. El reducer leia .user y
      // recibia undefined: quedaba token sin usuario y useAuthGuard, que
      // espera a que haya usuario, no redirigia a ningun sitio.
      authService.registerService.mockResolvedValue({
        token: "nuevo",
        fields: [{ userID: "u1", firstName: "Ana" }],
      });

      const store = makeStore();
      await store.dispatch(register({ userEmail: "a@b.c", password: "x" }));

      const { token, user, status } = store.getState().auth;
      expect(status).toBe("succeeded");
      expect(token).toBe("nuevo");
      expect(user).toEqual({ userID: "u1", firstName: "Ana" });
    });

    it("guarda el perfil recien creado para que sobreviva sin conexion", async () => {
      authService.registerService.mockResolvedValue({
        token: "nuevo",
        fields: [{ userID: "u1" }],
      });

      const store = makeStore();
      await store.dispatch(register({ userEmail: "a@b.c" }));

      expect(authStorage.setUser).toHaveBeenCalledWith({ userID: "u1" });
    });

    it("acepta tambien una respuesta con user directo", async () => {
      authService.registerService.mockResolvedValue({
        token: "nuevo",
        user: { userID: "u1" },
      });

      const store = makeStore();
      await store.dispatch(register({ userEmail: "a@b.c" }));

      expect(store.getState().auth.user).toEqual({ userID: "u1" });
    });

    it("sin token no abre sesion: la pantalla manda al login", async () => {
      authService.registerService.mockResolvedValue({ fields: [{ userID: "u1" }] });

      const store = makeStore();
      const res = await store.dispatch(register({ userEmail: "a@b.c" }));

      expect(store.getState().auth.token).toBeNull();
      expect(res.payload.token).toBeUndefined();
    });
  });

  describe("logout", () => {
    it("deja el estado limpio", () => {
      const store = makeStore({
        auth: {
          user: { userID: "u1" },
          token: "t",
          status: "succeeded",
          error: "algo",
          hydrated: true,
        },
      });

      store.dispatch(logout());

      const { user, token, status, error, hydrated } = store.getState().auth;
      expect(user).toBeNull();
      expect(token).toBeNull();
      expect(status).toBe("idle");
      expect(error).toBeNull();
      // hydrated no se toca: el token ya se leyo del storage en este arranque.
      expect(hydrated).toBe(true);
    });
  });

  describe("setToken", () => {
    it("acepta el token del callback de Google", () => {
      const store = makeStore();
      store.dispatch(setToken("desde-google"));
      expect(store.getState().auth.token).toBe("desde-google");
    });

    it("normaliza un token vacio a null", () => {
      const store = makeStore();
      store.dispatch(setToken(undefined));
      expect(store.getState().auth.token).toBeNull();
    });
  });

  describe("setAuthUserPatch", () => {
    it("fusiona sin borrar los campos previos", () => {
      const store = makeStore({
        auth: {
          user: { userID: "u1", firstName: "Ana" },
          token: "t",
          status: "idle",
          error: null,
          hydrated: true,
        },
      });

      store.dispatch(setAuthUserPatch({ lastName: "Perez" }));

      expect(store.getState().auth.user).toEqual({
        userID: "u1",
        firstName: "Ana",
        lastName: "Perez",
      });
    });
  });

  describe("toggleFavorite", () => {
    const baseState = {
      auth: {
        user: { userID: "u1", favoriteEvents: [] },
        token: "t",
        status: "idle",
        error: null,
        hydrated: true,
      },
    };

    it("agrega el favorito en Redux y lo persiste en el backend", async () => {
      usersService.patchUserProfile.mockResolvedValue({});

      const store = makeStore(baseState);
      await store.dispatch(toggleFavorite({ type: "event", id: "recE1" }));

      expect(store.getState().auth.user.favoriteEvents).toEqual(["recE1"]);
      expect(usersService.patchUserProfile).toHaveBeenCalledWith("u1", {
        favoriteEvents: ["recE1"],
      });
    });

    it("quita el favorito si ya estaba", async () => {
      usersService.patchUserProfile.mockResolvedValue({});

      const store = makeStore({
        auth: { ...baseState.auth, user: { userID: "u1", favoriteEvents: ["recE1"] } },
      });
      await store.dispatch(toggleFavorite({ type: "event", id: "recE1" }));

      expect(store.getState().auth.user.favoriteEvents).toEqual([]);
    });

    it("no hace nada sin usuario en sesion", async () => {
      const store = makeStore({
        auth: { user: null, token: null, status: "idle", error: null, hydrated: true },
      });
      await store.dispatch(toggleFavorite({ type: "event", id: "recE1" }));

      expect(usersService.patchUserProfile).not.toHaveBeenCalled();
    });
  });
});
