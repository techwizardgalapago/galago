import React from "react";
import { Platform } from "react-native";
import { render, screen, waitFor } from "@testing-library/react-native";
import CachedImage from "../../src/components/CachedImage";
import { cacheImage, getCachedUri, __resetImageCache } from "../../src/utils/imageCache";

jest.mock("../../src/utils/imageCache", () => ({
  cacheImage: jest.fn(),
  getCachedUri: jest.fn(),
  __resetImageCache: jest.fn(),
}));

const REMOTA = "https://cdn.galago.ec/foto.jpg";
const LOCAL = "file:///cache/galago-images/abc.jpg";

const uriPintado = () => screen.UNSAFE_getByType(require("react-native").Image).props.source?.uri;

beforeEach(() => {
  jest.clearAllMocks();
  getCachedUri.mockReturnValue(null);
  cacheImage.mockResolvedValue(null);
});

describe(`CachedImage en ${Platform.OS}`, () => {
  it("usa el archivo local si ya se resolvio en esta sesion", () => {
    getCachedUri.mockReturnValue(LOCAL);

    render(<CachedImage source={{ uri: REMOTA }} testID="img" />);

    expect(uriPintado()).toBe(LOCAL);
    expect(cacheImage).not.toHaveBeenCalled();
  });

  it("en arranque en frio resuelve del disco y cambia el uri", async () => {
    // El indice en memoria arranca vacio aunque el archivo siga en disco:
    // este es el caso que dejaba la foto sin aparecer hasta remontar.
    getCachedUri.mockReturnValue(null);
    cacheImage.mockResolvedValue(LOCAL);

    render(<CachedImage source={{ uri: REMOTA }} />);

    expect(uriPintado()).toBe(REMOTA); // primera pintada
    await waitFor(() => expect(uriPintado()).toBe(LOCAL)); // tras resolver
  });

  it("se queda con la URL remota si no hay copia local", async () => {
    cacheImage.mockResolvedValue(null);

    render(<CachedImage source={{ uri: REMOTA }} />);

    await waitFor(() => expect(cacheImage).toHaveBeenCalledWith(REMOTA));
    expect(uriPintado()).toBe(REMOTA);
  });

  it("no toca las fuentes que no son uri remoto", () => {
    const local = require("../../assets/icon.png");
    render(<CachedImage source={local} />);
    expect(cacheImage).not.toHaveBeenCalled();
  });

  it("conserva el resto de props", () => {
    render(<CachedImage source={{ uri: REMOTA }} resizeMode="cover" testID="foto" />);
    expect(screen.getByTestId("foto").props.resizeMode).toBe("cover");
  });
});
