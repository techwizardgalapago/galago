import { parseAttachmentImages } from "../../src/features/attachments/images";

describe("imágenes de un local", () => {
  it("prefiere la URL permanente sobre la firmada de Airtable", () => {
    const [img] = parseAttachmentImages([
      {
        permanentUrl: "https://cdn/foto.jpg",
        url: "https://airtable/firmada",
        filename: "foto.jpg",
      },
    ]);
    expect(img).toEqual({ url: "https://cdn/foto.jpg", filename: "foto.jpg" });
  });

  it("cae a la de Airtable si no hay permanente", () => {
    const [img] = parseAttachmentImages([{ url: "https://airtable/a", filename: "a.jpg" }]);
    expect(img.url).toBe("https://airtable/a");
  });

  it("lee la lista serializada que guarda SQLite", () => {
    const serializada = JSON.stringify([
      { permanentUrl: "https://cdn/1.jpg", filename: "1.jpg" },
      { permanentUrl: "https://cdn/2.jpg", filename: "2.jpg" },
    ]);
    expect(parseAttachmentImages(serializada).map((i) => i.url)).toEqual([
      "https://cdn/1.jpg",
      "https://cdn/2.jpg",
    ]);
  });

  it("acepta una URL suelta de los registros antiguos", () => {
    expect(parseAttachmentImages("https://cdn/vieja.jpg")).toEqual([
      { url: "https://cdn/vieja.jpg", filename: "" },
    ]);
  });

  it("descarta adjuntos sin URL y devuelve lista vacía si no hay nada", () => {
    expect(parseAttachmentImages([{ filename: "rota.jpg" }])).toEqual([]);
    expect(parseAttachmentImages(null)).toEqual([]);
    expect(parseAttachmentImages("")).toEqual([]);
  });
});
