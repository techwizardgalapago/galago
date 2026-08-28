import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import {
  initImageCache,
  getCachedUri,
  cacheImage,
  prefetchImages,
  clearImageCache,
  __resetImageCache,
} from "../../src/utils/imageCache";

jest.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
}));

const isWeb = Platform.OS === "web";
const URL_A = "https://cdn.galago.ec/foto_a.jpg";
const URL_B = "https://cdn.galago.ec/foto_b.png";

beforeEach(() => {
  jest.clearAllMocks();
  __resetImageCache();
  FileSystem.getInfoAsync.mockResolvedValue({ exists: false });
  FileSystem.makeDirectoryAsync.mockResolvedValue();
  FileSystem.deleteAsync.mockResolvedValue();
  FileSystem.readDirectoryAsync.mockResolvedValue([]);
  FileSystem.downloadAsync.mockImplementation(async (url, destino) => ({
    status: 200,
    uri: destino,
  }));
});

describe(`imageCache en ${Platform.OS}`, () => {
  it("descarga y recuerda la ruta local", async () => {
    const ruta = await cacheImage(URL_A);

    if (isWeb) {
      // En web no hay sistema de archivos: el navegador ya cachea.
      expect(ruta).toBeNull();
      expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
      return;
    }
    expect(ruta).toContain("galago-images/");
    expect(getCachedUri(URL_A)).toBe(ruta);
  });

  it("no vuelve a descargar lo que ya tiene", async () => {
    if (isWeb) return;
    await cacheImage(URL_A);
    await cacheImage(URL_A);
    expect(FileSystem.downloadAsync).toHaveBeenCalledTimes(1);
  });

  it("reutiliza el archivo si ya existe en disco de una sesion anterior", async () => {
    if (isWeb) return;
    FileSystem.getInfoAsync.mockImplementation(async (ruta) =>
      ruta.endsWith("/") ? { exists: true } : { exists: true, size: 1234 }
    );

    const ruta = await cacheImage(URL_A);

    expect(ruta).toBeTruthy();
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it("una descarga simultanea del mismo url solo baja una vez", async () => {
    if (isWeb) return;
    const [a, b] = await Promise.all([cacheImage(URL_A), cacheImage(URL_A)]);
    expect(a).toBe(b);
    expect(FileSystem.downloadAsync).toHaveBeenCalledTimes(1);
  });

  it("no cachea nada si la descarga falla, para reintentar luego", async () => {
    if (isWeb) return;
    FileSystem.downloadAsync.mockResolvedValue({ status: 404 });

    expect(await cacheImage(URL_A)).toBeNull();
    expect(getCachedUri(URL_A)).toBeNull();
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });

  it("sobrevive a un error del sistema de archivos", async () => {
    if (isWeb) return;
    FileSystem.downloadAsync.mockRejectedValue(new Error("sin espacio"));
    await expect(cacheImage(URL_A)).resolves.toBeNull();
  });

  it("ignora lo que no sea http(s)", async () => {
    // Las vistas previas del selector son file://: no hay nada que cachear.
    expect(await cacheImage("file:///tmp/foto.jpg")).toBeNull();
    expect(await cacheImage(null)).toBeNull();
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it("da nombres distintos a urls distintas y estables a la misma", async () => {
    if (isWeb) return;
    const a1 = await cacheImage(URL_A);
    const b1 = await cacheImage(URL_B);
    expect(a1).not.toBe(b1);
    expect(a1.endsWith(".jpg")).toBe(true);
    expect(b1.endsWith(".png")).toBe(true);

    __resetImageCache();
    FileSystem.getInfoAsync.mockImplementation(async (ruta) =>
      ruta.endsWith("/") ? { exists: true } : { exists: true, size: 10 }
    );
    expect(await cacheImage(URL_A)).toBe(a1); // misma url -> misma ruta
  });

  it("prefetch descarga en lote y no lanza aunque alguna falle", async () => {
    FileSystem.downloadAsync
      .mockResolvedValueOnce({ status: 200, uri: "x" })
      .mockResolvedValueOnce({ status: 500 });

    const res = await prefetchImages([URL_A, URL_B, URL_A]);

    if (isWeb) {
      expect(res).toEqual({ descargadas: 0, fallidas: 0 });
    } else {
      // URL_A repetida se cuenta una sola vez
      expect(res.descargadas + res.fallidas).toBe(2);
    }
  });

  it("clearImageCache borra el directorio y olvida el indice", async () => {
    if (isWeb) return;
    await cacheImage(URL_A);
    expect(getCachedUri(URL_A)).toBeTruthy();

    await clearImageCache();

    expect(FileSystem.deleteAsync).toHaveBeenCalled();
    expect(getCachedUri(URL_A)).toBeNull();
  });

  it("initImageCache crea el directorio una sola vez", async () => {
    await initImageCache();
    await initImageCache();
    if (isWeb) {
      expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    } else {
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(1);
    }
  });
});
