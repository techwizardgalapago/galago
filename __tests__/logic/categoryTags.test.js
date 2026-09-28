import {
  CATEGORY_TAGS,
  tagsForCategory,
  venueMatchesTag,
  venueMatchesTags,
} from "../../src/features/venues/categoryTags";

const buscar = (categoria, etiqueta) =>
  CATEGORY_TAGS[categoria].find((t) => t.label === etiqueta);

describe("tags por categoría", () => {
  it("devuelve los tags de la categoría y nada para una desconocida", () => {
    expect(tagsForCategory("tiendas").map((t) => t.label)).toEqual([
      "Souvenirs",
      "Tiendas",
      "Supermercados",
    ]);
    expect(tagsForCategory("inexistente")).toEqual([]);
  });

  it("casa por el tipo del local cuando el tipo implica el tag", () => {
    const hostales = buscar("hoteles", "Hostales");
    expect(venueMatchesTag({ venueCategory: "Hostal" }, hostales)).toBe(true);
    expect(venueMatchesTag({ venueCategory: "Hotel" }, hostales)).toBe(false);
  });

  it("ignora tildes y mayúsculas del tipo", () => {
    const cafes = buscar("alimentos", "Cafés");
    expect(venueMatchesTag({ venueCategory: "CAFÉ" }, cafes)).toBe(true);
    expect(venueMatchesTag({ venueCategory: "cafe" }, cafes)).toBe(true);
  });

  it("casa por las etiquetas del local, vengan en lista o en texto", () => {
    const happy = buscar("nocturna", "Happy Hour");
    expect(venueMatchesTag({ venueTags: ["Happy Hour"] }, happy)).toBe(true);
    expect(venueMatchesTag({ venueTags: "Música en vivo, Happy Hour" }, happy)).toBe(true);
    expect(venueMatchesTag({ venueTags: ["Buceo"] }, happy)).toBe(false);
  });

  it("no devuelve nada para un tag que aún depende de etiquetas sin poner", () => {
    const heladerias = buscar("alimentos", "Heladerías");
    expect(heladerias.types).toEqual([]);
    expect(venueMatchesTag({ venueCategory: "Restaurante" }, heladerias)).toBe(false);
  });

  it("sin tags seleccionados no filtra", () => {
    expect(venueMatchesTags({ venueCategory: "Tienda" }, [])).toBe(true);
  });

  it("con varios tags basta con cumplir uno", () => {
    const venue = { venueCategory: "Bar" };
    const seleccion = [buscar("nocturna", "Discotecas"), buscar("nocturna", "Bares")];
    expect(venueMatchesTags(venue, seleccion)).toBe(true);
    expect(venueMatchesTags({ venueCategory: "Hotel" }, seleccion)).toBe(false);
  });
});
