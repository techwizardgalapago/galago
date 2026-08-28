// -------------------------------------------------
// src/utils/images.js
// -------------------------------------------------
// Airtable firma las URLs de sus adjuntos con caducidad (~8h) y despues
// responde 410 Gone. Cualquier URL que guardemos —en Redux, en SQLite, o en
// la cache de imagenes del sistema— queda muerta.
//
// El backend anade `permanentUrl` (CloudFront) a cada adjunto cuyo archivo
// esta en S3. Aqui reescribimos la URL del adjunto a esa version permanente
// EN LA FRONTERA, es decir en cuanto el dato remoto entra a la app, para que:
//
//   1. lo que se persiste en SQLite siga siendo valido sin conexion, y
//   2. la cache de imagenes del SO acierte, porque la URL deja de cambiar
//      cada 8 horas (con URLs rotativas nunca hay reutilizacion posible).
//
// Los adjuntos sin `permanentUrl` (subidos a mano en Airtable, sin archivo en
// S3) se dejan intactos: siguen funcionando como hasta ahora.

const parseAttachments = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return null;
    }
  }
  return null;
};

export const normalizeAttachment = (img) => {
  if (!img || typeof img !== "object") return img;
  if (!img.permanentUrl) return img;

  // Las miniaturas las genera Airtable y caducan igual que la URL principal,
  // asi que se descartan cuando hay una permanente que las sustituye.
  const { thumbnails, ...resto } = img;
  return { ...resto, url: img.permanentUrl };
};

export const normalizeAttachments = (value) => {
  const list = parseAttachments(value);
  if (!list) return value; // string suelto u otra forma: se deja como esta
  return list.map(normalizeAttachment);
};

// Reescribe un campo de adjuntos dentro de un registro remoto.
export const normalizeRecordImages = (record, field) => {
  if (!record || !(field in record)) return record;
  return { ...record, [field]: normalizeAttachments(record[field]) };
};

// Getter unico: usar en pantallas nuevas en vez de reimplementarlo.
export const pickImageUrl = (img) =>
  img?.permanentUrl || img?.url || img?.thumbnails?.large?.url || null;

// Reune las URLs de imagen de una lista de registros, para precargarlas.
export const collectImageUrls = (records = [], field) => {
  const urls = [];
  (Array.isArray(records) ? records : []).forEach((record) => {
    const adjuntos = normalizeAttachments(record?.[field]);
    if (Array.isArray(adjuntos)) {
      adjuntos.forEach((img) => {
        const url = pickImageUrl(img);
        if (typeof url === "string" && /^https?:\/\//.test(url)) urls.push(url);
      });
    } else if (typeof adjuntos === "string" && /^https?:\/\//.test(adjuntos)) {
      urls.push(adjuntos);
    }
  });
  return [...new Set(urls)];
};
