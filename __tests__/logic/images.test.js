import {
  normalizeAttachment,
  normalizeAttachments,
  normalizeRecordImages,
  pickImageUrl,
} from "../../src/utils/images";

const CADUCA =
  "https://v5.airtableusercontent.com/v3/u/56/56/1787673600000/abc/def";
const PERMANENTE = "https://cdn.galago.ec/foto_1.png";

const adjunto = (over = {}) => ({
  id: "att123",
  url: CADUCA,
  filename: "foto_1.png",
  thumbnails: { large: { url: CADUCA + "/thumb" } },
  ...over,
});

describe("normalizeAttachment", () => {
  it("sustituye la URL caducable por la permanente", () => {
    const out = normalizeAttachment(adjunto({ permanentUrl: PERMANENTE }));
    expect(out.url).toBe(PERMANENTE);
  });

  it("descarta las miniaturas, que caducan igual que la URL principal", () => {
    const out = normalizeAttachment(adjunto({ permanentUrl: PERMANENTE }));
    expect(out).not.toHaveProperty("thumbnails");
  });

  it("conserva el resto de metadatos", () => {
    const out = normalizeAttachment(adjunto({ permanentUrl: PERMANENTE }));
    expect(out.id).toBe("att123");
    expect(out.filename).toBe("foto_1.png");
  });

  it("deja intacto lo que no tiene permanentUrl", () => {
    // Subidas a mano en Airtable: no hay archivo en S3, se sigue usando su URL.
    const original = adjunto();
    expect(normalizeAttachment(original)).toBe(original);
  });

  it("tolera valores que no son adjuntos", () => {
    expect(normalizeAttachment(null)).toBeNull();
    expect(normalizeAttachment("una-url")).toBe("una-url");
  });
});

describe("normalizeAttachments", () => {
  it("normaliza un array", () => {
    const out = normalizeAttachments([adjunto({ permanentUrl: PERMANENTE })]);
    expect(out[0].url).toBe(PERMANENTE);
  });

  it("normaliza un array serializado como string (asi vive en SQLite)", () => {
    const json = JSON.stringify([adjunto({ permanentUrl: PERMANENTE })]);
    const out = normalizeAttachments(json);
    expect(Array.isArray(out)).toBe(true);
    expect(out[0].url).toBe(PERMANENTE);
  });

  it("deja pasar una URL suelta sin tocarla", () => {
    expect(normalizeAttachments("https://cdn.galago.ec/x.png")).toBe(
      "https://cdn.galago.ec/x.png"
    );
  });

  it("no rompe con JSON invalido ni con vacios", () => {
    expect(normalizeAttachments("[roto")).toBe("[roto");
    expect(normalizeAttachments(null)).toBeNull();
    expect(normalizeAttachments([])).toEqual([]);
  });
});

describe("normalizeRecordImages", () => {
  it("reescribe solo el campo indicado", () => {
    const record = {
      venueID: "recV1",
      venueName: "La Nube",
      venueImage: [adjunto({ permanentUrl: PERMANENTE })],
    };
    const out = normalizeRecordImages(record, "venueImage");

    expect(out.venueImage[0].url).toBe(PERMANENTE);
    expect(out.venueName).toBe("La Nube");
    expect(record.venueImage[0].url).toBe(CADUCA); // no muta la entrada
  });

  it("no falla si el campo no existe", () => {
    const record = { venueID: "recV1" };
    expect(normalizeRecordImages(record, "venueImage")).toBe(record);
  });
});

describe("pickImageUrl", () => {
  it("prefiere permanentUrl sobre todo lo demas", () => {
    expect(pickImageUrl(adjunto({ permanentUrl: PERMANENTE }))).toBe(PERMANENTE);
  });

  it("cae a url y luego a la miniatura", () => {
    expect(pickImageUrl(adjunto())).toBe(CADUCA);
    expect(pickImageUrl({ thumbnails: { large: { url: "t" } } })).toBe("t");
    expect(pickImageUrl(null)).toBeNull();
  });
});

describe("saneado del nombre de archivo", () => {
  it("los espacios pasan a guion bajo, igual que al subir a S3", () => {
    // El backend reconstruye la URL con esa misma regla; si aqui difiriera,
    // la app pediria una clave que no existe en el bucket.
    const img = {
      url: CADUCA,
      filename: "playa brava.jpg",
      permanentUrl: "https://cdn.galago.ec/playa_brava.jpg",
    };
    expect(normalizeAttachment(img).url).toBe(
      "https://cdn.galago.ec/playa_brava.jpg"
    );
  });
});

describe("collectImageUrls", () => {
  const { collectImageUrls } = require("../../src/utils/images");

  it("reune las URLs de una lista de registros", () => {
    const venues = [
      { venueImage: [{ url: "https://cdn/a.jpg" }, { url: "https://cdn/b.jpg" }] },
      { venueImage: [{ url: "https://cdn/c.jpg" }] },
    ];
    expect(collectImageUrls(venues, "venueImage")).toEqual([
      "https://cdn/a.jpg",
      "https://cdn/b.jpg",
      "https://cdn/c.jpg",
    ]);
  });

  it("prefiere permanentUrl y elimina duplicados", () => {
    const venues = [
      { venueImage: [{ url: CADUCA, permanentUrl: "https://cdn/a.jpg" }] },
      { venueImage: [{ url: "https://cdn/a.jpg" }] },
    ];
    expect(collectImageUrls(venues, "venueImage")).toEqual(["https://cdn/a.jpg"]);
  });

  it("lee tambien el formato guardado en SQLite (string JSON)", () => {
    const venues = [{ venueImage: JSON.stringify([{ url: "https://cdn/a.jpg" }]) }];
    expect(collectImageUrls(venues, "venueImage")).toEqual(["https://cdn/a.jpg"]);
  });

  it("descarta lo que no sea http(s) y no rompe con vacios", () => {
    expect(collectImageUrls([{ venueImage: [{ url: "file:///x.jpg" }] }], "venueImage")).toEqual([]);
    expect(collectImageUrls([], "venueImage")).toEqual([]);
    expect(collectImageUrls(null, "venueImage")).toEqual([]);
    expect(collectImageUrls([{}], "venueImage")).toEqual([]);
  });
});
