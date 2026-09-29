// Lectura de un campo de adjuntos de Airtable (las fotos de un local o de un
// evento). El campo llega de tres formas:
// lista de adjuntos de Airtable, esa misma lista ya serializada cuando viene
// de la copia local en SQLite, o una URL suelta en registros antiguos.

const primeraUrl = (img) => {
  if (typeof img === "string") return img.trim();
  // `permanentUrl` la anade el backend y apunta a CloudFront. La `url` de
  // Airtable va firmada y caduca a las ocho horas, asi que solo sirve de
  // respaldo para adjuntos que no esten en S3.
  return (
    img?.permanentUrl || img?.url || img?.thumbnails?.large?.url || ""
  );
};

export const parseAttachmentImages = (venueImage) => {
  let lista = venueImage;

  if (typeof lista === "string" && lista.trim()) {
    try {
      lista = JSON.parse(lista);
    } catch {
      // Registros antiguos guardaban una URL suelta, no una lista.
      lista = [lista];
    }
  }

  if (!Array.isArray(lista)) return [];

  return lista
    .map((img) => ({
      url: primeraUrl(img),
      // Identifica al adjunto en S3: es lo que el backend necesita para
      // borrarlo uno a uno.
      filename: typeof img === "string" ? "" : img?.filename || "",
    }))
    .filter((img) => img.url);
};
