import {
  decideRedirect,
  esRutaDeRegistro,
  esRutaPublica,
  LOGIN_HREF,
  REGISTER_HREF,
  REGISTER_ROUTE,
} from "../../src/features/users/authRedirect";

const completo = {
  fullName: "Ana Perez",
  userEmail: "ana@example.com",
  userRole: "turista",
  countryOfOrigin: "Ecuador",
  reasonForTravel: ["Turismo"],
};
const incompleto = { userEmail: "ana@example.com" };

describe("esRutaDeRegistro", () => {
  it("reconoce la ruta tal como la devuelve usePathname (sin grupos)", () => {
    // Este era el bug: se comparaba contra "/(tabs)/perfil/settings/register"
    // y usePathname devuelve la version sin grupo, asi que nunca coincidia.
    expect(esRutaDeRegistro(REGISTER_ROUTE)).toBe(true);
    expect(esRutaDeRegistro("/perfil/settings/register")).toBe(true);
  });

  it("reconoce tambien la forma con grupo", () => {
    expect(esRutaDeRegistro(REGISTER_HREF)).toBe(true);
  });

  it("no confunde otras rutas", () => {
    expect(esRutaDeRegistro("/perfil")).toBe(false);
    expect(esRutaDeRegistro("/login")).toBe(false);
    expect(esRutaDeRegistro(null)).toBe(false);
  });
});

describe("esRutaPublica", () => {
  it("acepta login y callback sin grupo", () => {
    expect(esRutaPublica("/login", [])).toBe(true);
    expect(esRutaPublica("/auth/callback", [])).toBe(true);
  });

  it("acepta cualquier ruta del grupo (auth)", () => {
    expect(esRutaPublica("/lo-que-sea", ["(auth)", "login"])).toBe(true);
  });

  it("rechaza las privadas", () => {
    expect(esRutaPublica("/perfil", ["(tabs)", "perfil"])).toBe(false);
  });
});

describe("decideRedirect", () => {
  const base = { hydrated: true, pathname: "/perfil", segments: ["(tabs)", "perfil"] };

  it("no decide nada antes de hidratar la sesion", () => {
    expect(decideRedirect({ ...base, hydrated: false, token: null })).toBeNull();
  });

  it("sin token manda al login desde una ruta privada", () => {
    expect(decideRedirect({ ...base, token: null })).toBe(LOGIN_HREF);
  });

  it("sin token deja estar en el login, sin redirigir a si mismo", () => {
    expect(
      decideRedirect({ ...base, token: null, pathname: "/login", segments: ["(auth)", "login"] })
    ).toBeNull();
  });

  it("con token pero sin usuario aun, espera sin mover", () => {
    expect(decideRedirect({ ...base, token: "t", user: null })).toBeNull();
  });

  it("perfil incompleto manda a completarlo", () => {
    expect(decideRedirect({ ...base, token: "t", user: incompleto })).toBe(REGISTER_HREF);
  });

  it("estando ya en completar perfil NO vuelve a redirigir", () => {
    // El bucle que dejaba la app rebotando: el guard no se reconocia a si mismo.
    expect(
      decideRedirect({
        hydrated: true,
        token: "t",
        user: incompleto,
        pathname: REGISTER_ROUTE,
        segments: ["(tabs)", "perfil", "settings", "register"],
      })
    ).toBeNull();
  });

  it("perfil completo en una ruta publica entra a la app", () => {
    expect(
      decideRedirect({
        hydrated: true,
        token: "t",
        user: completo,
        pathname: "/login",
        segments: ["(auth)", "login"],
      })
    ).toBe("/");
  });

  it("perfil completo en una ruta privada se queda donde esta", () => {
    expect(decideRedirect({ ...base, token: "t", user: completo })).toBeNull();
  });

  it("nunca devuelve la ruta en la que ya se esta", () => {
    const casos = [
      { token: null, user: null, pathname: "/login", segments: ["(auth)", "login"] },
      { token: "t", user: incompleto, pathname: REGISTER_ROUTE, segments: ["(tabs)"] },
      { token: "t", user: completo, pathname: "/perfil", segments: ["(tabs)", "perfil"] },
    ];
    casos.forEach((c) => {
      const destino = decideRedirect({ hydrated: true, ...c });
      if (destino) expect(destino).not.toBe(c.pathname);
    });
  });
});
