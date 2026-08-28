// -------------------------------------------------
// src/utils/imageCache.js
// -------------------------------------------------
// Caché de imágenes en disco, para que la app muestre fotos sin conexión.
//
// Por qué hace falta: aunque las URLs ya no caducan, la caché HTTP del sistema
// no garantiza nada. CloudFront no envía `Cache-Control`, así que iOS decide
// por heurística y Android por su propia política de desalojo. Aquí bajamos el
// archivo a disco y guardamos la ruta local, que sí controlamos.
//
// En web no se usa: no hay sistema de archivos y el navegador ya cachea.

import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";

const HABILITADO = Platform.OS !== "web";

// cacheDirectory es el sitio correcto para datos regenerables. iOS puede
// vaciarlo si el dispositivo se queda sin espacio; a cambio no entra en la
// copia de seguridad de iCloud, que es lo que corresponde para imágenes que
// se pueden volver a descargar.
const DIR = HABILITADO ? `${FileSystem.cacheDirectory}galago-images/` : null;

const LIMITE_BYTES = 80 * 1024 * 1024; // 80 MB
const CONCURRENCIA = 4;

// url -> ruta file:// local. Se consulta en cada render, asi que vive en memoria.
const indice = new Map();
const enVuelo = new Map();
let listo = false;

// FNV-1a: determinista y sin dependencias. Solo nombra archivos de caché.
const hashUrl = (url) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16)}-${url.length.toString(16)}`;
};

const extensionDe = (url) => {
  const limpia = String(url).split("?")[0].split("#")[0];
  const punto = limpia.lastIndexOf(".");
  const barra = limpia.lastIndexOf("/");
  if (punto <= barra) return "";
  const ext = limpia.slice(punto).toLowerCase();
  return /^\.[a-z0-9]{2,5}$/.test(ext) ? ext : "";
};

const rutaLocalDe = (url) => `${DIR}${hashUrl(url)}${extensionDe(url)}`;

const esRemota = (url) => typeof url === "string" && /^https?:\/\//.test(url);

/** Crea el directorio y reconstruye el índice desde lo ya descargado. */
export const initImageCache = async () => {
  if (!HABILITADO || listo) return;
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
    }
    listo = true;
  } catch (e) {
    console.warn("imageCache: no se pudo preparar el directorio:", e?.message);
  }
};

/**
 * Ruta local si ya está descargada. Sincrónico a propósito: se llama en
 * render y no puede esperar.
 */
export const getCachedUri = (url) => (HABILITADO ? indice.get(url) || null : null);

/** Descarga la imagen si falta. Devuelve la ruta local, o null si no se pudo. */
export const cacheImage = async (url) => {
  if (!HABILITADO || !esRemota(url)) return null;
  if (indice.has(url)) return indice.get(url);
  if (enVuelo.has(url)) return enVuelo.get(url);

  const tarea = (async () => {
    try {
      await initImageCache();
      const destino = rutaLocalDe(url);

      const info = await FileSystem.getInfoAsync(destino);
      if (info.exists && info.size > 0) {
        indice.set(url, destino);
        return destino;
      }

      const res = await FileSystem.downloadAsync(url, destino);
      if (res?.status !== 200) {
        // Sin conexión o error del servidor: se deja para el próximo intento.
        await FileSystem.deleteAsync(destino, { idempotent: true });
        return null;
      }
      indice.set(url, destino);
      return destino;
    } catch {
      return null;
    } finally {
      enVuelo.delete(url);
    }
  })();

  enVuelo.set(url, tarea);
  return tarea;
};

/** Descarga en lote, sin bloquear ni propagar errores. */
export const prefetchImages = async (urls = []) => {
  if (!HABILITADO) return { descargadas: 0, fallidas: 0 };

  const pendientes = [...new Set(urls.filter(esRemota))].filter(
    (u) => !indice.has(u)
  );
  let descargadas = 0;
  let fallidas = 0;

  for (let i = 0; i < pendientes.length; i += CONCURRENCIA) {
    const lote = pendientes.slice(i, i + CONCURRENCIA);
    const res = await Promise.all(lote.map((u) => cacheImage(u)));
    res.forEach((r) => (r ? descargadas++ : fallidas++));
  }

  await evictIfNeeded();
  return { descargadas, fallidas };
};

/** Si la caché supera el límite, borra lo más antiguo hasta bajar del 80%. */
export const evictIfNeeded = async () => {
  if (!HABILITADO || !listo) return 0;
  try {
    const nombres = await FileSystem.readDirectoryAsync(DIR);
    const archivos = [];
    let total = 0;

    for (const nombre of nombres) {
      const ruta = `${DIR}${nombre}`;
      const info = await FileSystem.getInfoAsync(ruta);
      if (!info.exists) continue;
      archivos.push({ ruta, size: info.size || 0, mtime: info.modificationTime || 0 });
      total += info.size || 0;
    }

    if (total <= LIMITE_BYTES) return 0;

    archivos.sort((a, b) => a.mtime - b.mtime); // más antiguo primero
    const objetivo = LIMITE_BYTES * 0.8;
    let borrados = 0;

    for (const archivo of archivos) {
      if (total <= objetivo) break;
      await FileSystem.deleteAsync(archivo.ruta, { idempotent: true });
      for (const [url, ruta] of indice.entries()) {
        if (ruta === archivo.ruta) indice.delete(url);
      }
      total -= archivo.size;
      borrados++;
    }
    return borrados;
  } catch {
    return 0;
  }
};

export const clearImageCache = async () => {
  if (!HABILITADO) return;
  try {
    await FileSystem.deleteAsync(DIR, { idempotent: true });
  } catch {
    /* da igual: es caché */
  }
  indice.clear();
  enVuelo.clear();
  listo = false;
};

// Solo para pruebas.
export const __resetImageCache = () => {
  indice.clear();
  enVuelo.clear();
  listo = false;
};
