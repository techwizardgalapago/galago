// src/utils/maps.js
import { Platform } from 'react-native';
import { api } from '../services/api';

// 0. Saca el enlace del texto que la persona pega.
//
// Compartir un sitio desde la APP de Google Maps no copia la URL sola: copia
// el nombre del lugar y debajo el enlace, por ejemplo
//
//   FUNDAR GALAPAGOS
//   https://maps.app.goo.gl/99AHGCnaU95i9JxS6?g_st=aw
//
// Desde Maps en el navegador, en cambio, se copia la URL pelada. Por eso
// 'los links de la app no servian y los de la web si': el texto entero se
// trataba como si fuera una URL, el backend intentaba descargarlo y fallaba.
export const extraerUrl = (texto) => {
  if (typeof texto !== "string") return "";
  const encontrado = texto.match(/https?:\/\/\S+/i);
  if (!encontrado) return texto.trim();
  // Si el enlace venia dentro de una frase, se quita la puntuacion final que
  // se haya pegado al pegarlo ('...goo.gl/abc.' o '(...goo.gl/abc)').
  return encontrado[0].replace(/[.,;:!?)\]}>'"]+$/, "");
};

// 1. Extrae lat/lng de una URL "larga" de Google Maps (varios formatos)
export function extractLatLngFromGoogleMapsUrl(url) {
  try {
    if (!url) return null;
    const u = url.trim();

    // !3dlat!4dlng  →  pin exacto del lugar (más preciso que el centro del mapa)
    const dataMatch = u.match(/!3d(-?\d+\.\d+).*?!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      return { latitude: parseFloat(dataMatch[1]), longitude: parseFloat(dataMatch[2]) };
    }

    // @lat,lng  →  centro del viewport (menos preciso, fallback)
    const atMatch = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return { latitude: parseFloat(atMatch[1]), longitude: parseFloat(atMatch[2]) };
    }

    // query=lat,lng  →  maps/search/?query=-2.17,-79.92
    const queryMatch = u.match(/[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (queryMatch) {
      return { latitude: parseFloat(queryMatch[1]), longitude: parseFloat(queryMatch[2]) };
    }

    // ll=lat,lng  →  maps.google.com/maps?ll=-2.17,-79.92
    const llMatch = u.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (llMatch) {
      return { latitude: parseFloat(llMatch[1]), longitude: parseFloat(llMatch[2]) };
    }

    // q=lat,lng  →  maps/search?q=-2.17,-79.92
    const qMatch = u.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      return { latitude: parseFloat(qMatch[1]), longitude: parseFloat(qMatch[2]) };
    }

    return null;
  } catch (error) {
    console.error('Error extrayendo lat/lng desde URL:', error);
    return null;
  }
}

// 2. Resolver link corto en native (fetch directo con headers de navegador)
async function resolveShortMapsUrlNative(shortUrl) {
  try {
    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    return response.url || shortUrl;
  } catch (error) {
    console.error('Error resolviendo link corto (native):', error);
    return null;
  }
}

// 3. Resolver link corto en web (via backend proxy para evitar CORS)
async function resolveShortMapsUrlWeb(shortUrl) {
  try {
    const resp = await api.get(`/resolve-url?url=${encodeURIComponent(shortUrl)}`);
    return resp.data?.resolved || null;
  } catch (error) {
    console.error('Error resolviendo link corto (web/backend):', error);
    return null;
  }
}

// 4. Función completa: acepta link corto o largo, cualquier plataforma
export async function getCoordsFromGoogleMapsLink(texto) {
  if (!texto) return null;

  // Lo primero: quedarse solo con el enlace. Lo que llega puede ser el texto
  // que comparte la app de Maps, con el nombre del sitio delante.
  const url = extraerUrl(texto);
  if (!url) return null;

  const isShort =
    url.includes('maps.app.goo.gl') ||
    url.includes('goo.gl/maps');

  let finalUrl = url;

  if (isShort) {
    const resolved =
      Platform.OS === 'web'
        ? await resolveShortMapsUrlWeb(url)
        : await resolveShortMapsUrlNative(url);

    if (resolved) finalUrl = resolved;
  }

  return extractLatLngFromGoogleMapsUrl(finalUrl);
}
