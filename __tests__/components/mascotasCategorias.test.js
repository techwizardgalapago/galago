// Las mascotas de las fichas de categoria.
//
// Se comprueba que la imagen llega de verdad al arbol pintado: el require
// puede resolver y la imagen seguir sin verse si el estilo la deja sin
// altura, que es exactamente lo que no se nota hasta abrir la app.

import { render, screen } from "@testing-library/react-native";
import { Image } from "react-native";

import { CategoryTile, CATEGORIES, MASCOTAS } from "../../src/app/(tabs)/locales/index";

const porClave = (clave) => CATEGORIES.find((c) => c.key === clave);

describe("mascotas de las fichas de categoria", () => {
  it("pinta la mascota de la categoria", async () => {
    await render(<CategoryTile category={porClave("alimentos")} island="Santa Cruz" />);

    const imagenes = screen.UNSAFE_root.findAllByType(Image);
    const mascota = imagenes.find((i) => i.props.source === MASCOTAS.alimentos);
    expect(mascota).toBeTruthy();
  });

  it("le da altura a la mascota, que sin ella no se veria", async () => {
    await render(<CategoryTile category={porClave("alimentos")} island="Santa Cruz" />);

    const imagenes = screen.UNSAFE_root.findAllByType(Image);
    const mascota = imagenes.find((i) => i.props.source === MASCOTAS.alimentos);
    const estilo = Array.isArray(mascota.props.style)
      ? Object.assign({}, ...mascota.props.style)
      : mascota.props.style;

    expect(estilo.position).toBe("absolute");
    expect(estilo.height).toBeTruthy();
    expect(mascota.props.resizeMode).toBe("contain");
  });

  it("sigue mostrando la etiqueta junto a la mascota", async () => {
    await render(<CategoryTile category={porClave("alimentos")} island="Santa Cruz" />);
    expect(screen.getByText("Alimentos y Bebidas")).toBeTruthy();
  });

  it("no rompe la ficha que todavia no tiene mascota", async () => {
    const sinMascota = porClave("informacion");
    expect(MASCOTAS[sinMascota.key]).toBeUndefined();

    await render(<CategoryTile category={sinMascota} island="Santa Cruz" />);
    expect(screen.getByText("Información")).toBeTruthy();
  });

  it("cada mascota declarada corresponde a una categoria que existe", () => {
    const claves = CATEGORIES.map((c) => c.key);
    Object.keys(MASCOTAS).forEach((clave) => {
      expect(claves).toContain(clave);
    });
  });
});
