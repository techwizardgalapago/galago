// Guardar el avatar elegido.

import { configureStore } from "@reduxjs/toolkit";
import authReducer, { setUser, setAvatar } from "../../src/store/slices/authSlice";
import { patchUserProfile } from "../../src/services/usersService";

jest.mock("../../src/services/usersService", () => ({
  patchUserProfile: jest.fn(),
}));

jest.mock("../../src/utils/authStorage", () => ({
  authStorage: {
    getToken: jest.fn(),
    getUser: jest.fn(),
    setUser: jest.fn(),
    clearUser: jest.fn(),
  },
}));

const USUARIO = { userID: "recAAAAAAAAAAAAAA", firstName: "Carlos" };

const crearStore = (user = USUARIO) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  store.dispatch(setUser(user));
  return store;
};

const avatarEn = (store) => store.getState().auth.user?.userAvatar;

describe("setAvatar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    patchUserProfile.mockResolvedValue({});
  });

  it("guarda la clave en el perfil y la manda al servidor", async () => {
    const store = crearStore();

    await store.dispatch(setAvatar("surf"));

    expect(avatarEn(store)).toBe("surf");
    expect(patchUserProfile).toHaveBeenCalledWith(USUARIO.userID, {
      userAvatar: "surf",
    });
  });

  it("se ve el cambio antes de que conteste el servidor", async () => {
    // Elegir avatar no puede quedarse esperando a la red: con conexion mala,
    // la persona tocaria otra vez creyendo que no se registro.
    let responder;
    patchUserProfile.mockReturnValue(new Promise((r) => { responder = r; }));
    const store = crearStore();

    const enCurso = store.dispatch(setAvatar("dive"));
    expect(avatarEn(store)).toBe("dive");

    responder({});
    await enCurso;
    expect(avatarEn(store)).toBe("dive");
  });

  it("vuelve al anterior si la escritura falla", async () => {
    // Si se quedara el nuevo, el perfil estaria mintiendo: al recargar
    // reaparece el viejo y parece que la app perdio la eleccion.
    patchUserProfile.mockRejectedValue(new Error("sin red"));
    const store = crearStore({ ...USUARIO, userAvatar: "food" });

    await store.dispatch(setAvatar("party"));

    expect(avatarEn(store)).toBe("food");
  });

  it("deja el circulo sin clave propia si fallando no habia ninguna", async () => {
    patchUserProfile.mockRejectedValue(new Error("sin red"));
    const store = crearStore();

    await store.dispatch(setAvatar("party"));

    // A null, no a 'party': asi `claveDeAvatar` vuelve a dar el de por defecto.
    expect(avatarEn(store)).toBeNull();
  });

  it("no escribe nada al elegir el que ya lleva puesto", async () => {
    const store = crearStore({ ...USUARIO, userAvatar: "music" });

    await store.dispatch(setAvatar("music"));

    expect(patchUserProfile).not.toHaveBeenCalled();
    expect(avatarEn(store)).toBe("music");
  });

  it("no intenta guardar sin sesion", async () => {
    const store = crearStore(null);

    await store.dispatch(setAvatar("surf"));

    expect(patchUserProfile).not.toHaveBeenCalled();
  });
});
