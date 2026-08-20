import { Platform } from "react-native";
import {
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

describe("extractLatLngFromGoogleMapsUrl", () => {
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
