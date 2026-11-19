import { Platform } from "react-native";
import {
  extraerUrl,
  extractLatLngFromGoogleMapsUrl,
  getCoordsFromGoogleMapsLink,
} from "../../src/utils/maps";
import { api } from "../../src/services/api";

jest.mock("../../src/services/api", () => ({
  api: { get: jest.fn() },
  API_URL: "https://api.galago.ec/api/v1/",
  buildApiUrl: (p = "") => `https://api.galago.ec/api/v1/${p}`,
  setAuthHeader: jest.fn(),
  setUnauthorizedHandler: jest.fn(),
}));

const isWeb = Platform.OS === "web";
const GALAPAGOS = { latitude: -0.7435, longitude: -90.3139 };

afterEach(() => {
  jest.clearAllMocks();
});

// Compartir un sitio desde la APP de Google Maps no copia la URL sola: copia
// el nombre del lugar y debajo el enlace. Desde Maps en el navegador se copia
// la URL pelada. Por eso 'los de la app no servian y los de la web si': el
// texto entero se mandaba al backend como si fuera una direccion.
describe("extraerUrl", () => {
  const ENLACE = "https://maps.app.goo.gl/99AHGCnaU95i9JxS6?g_st=aw";

  it("saca el enlace del texto que comparte la app de Maps", () => {
    expect(extraerUrl(`FUNDAR GALAPAGOS\n${ENLACE}`)).toBe(ENLACE);
  });

  it("tambien cuando el enlace viene dentro de una frase", () => {
    expect(extraerUrl(`Mira este sitio en Google Maps ${ENLACE}`)).toBe(ENLACE);
  });

  it("deja intacta una URL pelada, como la que se copia desde la web", () => {
    expect(extraerUrl(ENLACE)).toBe(ENLACE);
  });

  it("quita la puntuacion que quede pegada al final", () => {
    expect(extraerUrl(`Esta aqui: ${ENLACE}.`)).toBe(ENLACE);
    expect(extraerUrl(`(${ENLACE})`)).toBe(ENLACE);
  });

  it("se queda con el primer enlace si hay varios", () => {
    expect(extraerUrl(`${ENLACE} y tambien https://otro.ejemplo/x`)).toBe(ENLACE);
  });

  it("no se rompe con texto sin enlaces ni con entradas vacias", () => {
    expect(extraerUrl("sin enlaces aqui")).toBe("sin enlaces aqui");
    expect(extraerUrl(null)).toBe("");
    expect(extraerUrl(undefined)).toBe("");
  });
});

describe(`extractLatLngFromGoogleMapsUrl`, () => {

  it("prefiere el pin exacto (!3d!4d) sobre el centro del mapa (@)", () => {
    const url =
      "https://www.google.com/maps/place/X/@-0.9999,-90.9999,17z/data=!3m1!4b1!4m5!3m4!1s0x0:0x0!8m2!3d-0.7435!4d-90.3139";
    expect(extractLatLngFromGoogleMapsUrl(url)).toEqual(GALAPAGOS);
  });

  it.each([
    ["@lat,lng", "https://www.google.com/maps/@-0.7435,-90.3139,17z"],
    ["query=", "https://www.google.com/maps/search/?api=1&query=-0.7435,-90.3139"],
    ["ll=", "https://maps.google.com/maps?ll=-0.7435,-90.3139&z=17"],
    ["q=", "https://www.google.com/maps/search?q=-0.7435,-90.3139"],
  ])("entiende el formato %s", (_nombre, url) => {
    expect(extractLatLngFromGoogleMapsUrl(url)).toEqual(GALAPAGOS);
  });

  it("tolera espacios alrededor de la URL", () => {
    expect(
      extractLatLngFromGoogleMapsUrl("  https://www.google.com/maps/@-0.7435,-90.3139,17z  ")
    ).toEqual(GALAPAGOS);
  });

  it("devuelve null ante entradas sin coordenadas", () => {
    expect(extractLatLngFromGoogleMapsUrl(null)).toBeNull();
    expect(extractLatLngFromGoogleMapsUrl("")).toBeNull();
    expect(extractLatLngFromGoogleMapsUrl("https://example.com")).toBeNull();
    expect(
      extractLatLngFromGoogleMapsUrl("https://www.google.com/maps/place/La+Nube")
    ).toBeNull();
  });
});

describe(`getCoordsFromGoogleMapsLink en ${Platform.OS}`, () => {
  it("extrae directo de un link largo sin resolver nada", async () => {
    const url = "https://www.google.com/maps/@-0.7435,-90.3139,17z";

    await expect(getCoordsFromGoogleMapsLink(url)).resolves.toEqual(GALAPAGOS);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("devuelve null si no le pasan URL", async () => {
    await expect(getCoordsFromGoogleMapsLink("")).resolves.toBeNull();
  });

  // El fallo real: se pegaba lo que comparte la app de Maps y el texto entero
  // viajaba al backend, que intentaba descargarlo como si fuera una direccion
  // y respondia 500. Lo que se envia tiene que ser solo el enlace.
  it("resuelve el texto que comparte la app, no solo la URL pelada", async () => {
    const corto = "https://maps.app.goo.gl/99AHGCnaU95i9JxS6?g_st=aw";
    const pegado = `FUNDAR GALAPAGOS\n${corto}`;
    const largo =
      "https://www.google.com/maps/place/X/data=!4m6!3m5!8m2!3d-0.7435!4d-90.3139";

    if (isWeb) {
      api.get.mockResolvedValue({ data: { resolved: largo } });
    } else {
      global.fetch = jest.fn().mockResolvedValue({ url: largo });
    }

    await expect(getCoordsFromGoogleMapsLink(pegado)).resolves.toEqual(GALAPAGOS);

    if (isWeb) {
      expect(api.get).toHaveBeenCalledWith(
        `/resolve-url?url=${encodeURIComponent(corto)}`
      );
    } else {
      expect(global.fetch).toHaveBeenCalledWith(corto, expect.any(Object));
    }
  });

  it("resuelve los links cortos antes de extraer", async () => {
    const corto = "https://maps.app.goo.gl/abc123";
    const largo = "https://www.google.com/maps/@-0.7435,-90.3139,17z";

    if (isWeb) {
      // En web pasa por el proxy del backend para esquivar CORS.
      api.get.mockResolvedValue({ data: { resolved: largo } });
    } else {
      global.fetch = jest.fn().mockResolvedValue({ url: largo });
    }

    await expect(getCoordsFromGoogleMapsLink(corto)).resolves.toEqual(GALAPAGOS);

    if (isWeb) {
      expect(api.get).toHaveBeenCalledWith(
        `/resolve-url?url=${encodeURIComponent(corto)}`
      );
    } else {
      expect(global.fetch).toHaveBeenCalled();
    }
  });

  it("no rompe si el link corto no se puede resolver", async () => {
    const corto = "https://maps.app.goo.gl/abc123";

    if (isWeb) {
      api.get.mockRejectedValue(new Error("CORS"));
    } else {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network"));
    }

    await expect(getCoordsFromGoogleMapsLink(corto)).resolves.toBeNull();
  });
});
