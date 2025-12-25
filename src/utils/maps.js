// src/utils/maps.js

// 1. Extrae lat/lng de una URL "larga" de Google Maps
export function extractLatLngFromGoogleMapsUrl(url) {
  try {
    if (!url) return null;

    // Quitar espacios
    const cleanUrl = url.trim();

    // Caso 1: patrón @lat,lng
    // Ej: https://www.google.com/maps/place/.../@-2.1709979,-79.9223592,17z
    const atPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const atMatch = cleanUrl.match(atPattern);
    if (atMatch) {
      return {
        latitude: parseFloat(atMatch[1]),
        longitude: parseFloat(atMatch[2]),
      };
    }

    // Caso 2: query=lat,lng
    // Ej: https://www.google.com/maps/search/?api=1&query=-2.17099,-79.92235
    const queryPattern = /[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const queryMatch = cleanUrl.match(queryPattern);
    if (queryMatch) {
      return {
        latitude: parseFloat(queryMatch[1]),
        longitude: parseFloat(queryMatch[2]),
      };
    }

    return null;
  } catch (error) {
    console.error('Error extrayendo lat/lng desde URL:', error);
    return null;
  }
}

// 2. Resolver links cortos tipo https://maps.app.goo.gl/...
export async function resolveShortMapsUrl(shortUrl) {
  try {
    if (!shortUrl) return null;

    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    // La URL final (ya redirigida) debería tener las coordenadas
    return response.url || shortUrl;
  } catch (error) {
    console.error('Error resolviendo link corto de Maps:', error);
    return null;
  }
}

// 3. Función completa: acepta link corto o largo
export async function getCoordsFromGoogleMapsLink(url) {
  if (!url) return null;

  // Si parece link corto de maps, lo resolvemos primero
  const isShort =
    url.includes('maps.app.goo.gl') ||
    url.includes('goo.gl/maps');

  let finalUrl = url;

  if (isShort) {
    const resolved = await resolveShortMapsUrl(url);
    if (resolved) {
      finalUrl = resolved;
    }
  }

  return extractLatLngFromGoogleMapsUrl(finalUrl);
}
