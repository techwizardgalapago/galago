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

  const estiloDeLaMascota = async (clave) => {
    await render(<CategoryTile category={porClave(clave)} island="Santa Cruz" />);
    const imagenes = screen.UNSAFE_root.findAllByType(Image);
    const mascota = imagenes.find((i) => i.props.source === MASCOTAS[clave]);
    const estilo = Array.isArray(mascota.props.style)
      ? Object.assign({}, ...mascota.props.style)
      : mascota.props.style;
    return { mascota, estilo };
  };

  it("le da sitio a la mascota sin sacarla de la ficha", async () => {
    const { mascota, estilo } = await estiloDeLaMascota("alimentos");

    // En absoluto no se medía contra la ficha: en web la imagen salía de 619
    // de ancho, se desbordaba sobre las fichas de al lado y quedaba tapada
    // por ellas. Como hijo normal de la columna eso no puede volver a pasar.
    expect(estilo.position).toBeUndefined();
    expect(mascota.props.resizeMode).toBe("contain");
  });

  it("mide lo mismo tenga la etiqueta una linea o dos", async () => {
    // 'Alimentos y Bebidas' y 'Hoteles y Alojamientos' no ocupan las mismas
    // lineas. Cuando la mascota crecia con el sobrante de la ficha, eso la
    // hacia 23 mas baja en una que en otra y cada una salia de un tamano.
    const una = await estiloDeLaMascota("alimentos");
    const dos = await estiloDeLaMascota("hoteles");

    expect(una.estilo.height).toBe(dos.estilo.height);
    expect(typeof una.estilo.height).toBe("number");
    expect(una.estilo.flex).toBeUndefined();
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
