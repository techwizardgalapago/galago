// Las mascotas de las fichas de categoria.
//
// Se comprueba que el dibujo llega de verdad al arbol pintado: el import
// puede resolver y el gosito seguir sin verse si el estilo lo deja sin
// altura, que es exactamente lo que no se nota hasta abrir la app.

import { render, screen } from "@testing-library/react-native";
import { Image } from "react-native";

import {
  CategoryTile,
  CATEGORIES,
  MASCOTAS,
  MASCOTAS_PNG,
} from "../../src/app/(tabs)/locales/index";

const porClave = (clave) => CATEGORIES.find((c) => c.key === clave);

// El alto no lo lleva el dibujo sino la caja que lo envuelve, y entre una y
// otro hay envoltorios que no interesa fijar aqui. Se sube por los padres
// hasta el primero que reserve un alto de verdad.
const cajaConAlto = (nodo) => {
  for (let n = nodo; n; n = n.parent) {
    const estilo = Array.isArray(n.props?.style)
      ? Object.assign({}, ...n.props.style.filter(Boolean))
      : n.props?.style;
    if (estilo && typeof estilo.height === "number") return estilo;
  }
  return null;
};

const pintar = async (clave) => {
  await render(<CategoryTile category={porClave(clave)} island="Santa Cruz" />);
};

describe("mascotas de las fichas de categoria", () => {
  it("cada ficha pinta la mascota de su categoria y no la de otra", async () => {
    // El reparto se hizo primero a ojo y varias quedaron cambiadas. Esto fija
    // que cada clave trae su dibujo.
    for (const clave of Object.keys(MASCOTAS)) {
      await pintar(clave);

      expect(screen.UNSAFE_root.findAllByType(MASCOTAS[clave])).toHaveLength(1);

      const ajenas = Object.entries(MASCOTAS).filter(([otra]) => otra !== clave);
      for (const [, Otra] of ajenas) {
        expect(screen.UNSAFE_root.findAllByType(Otra)).toHaveLength(0);
      }
      screen.unmount();
    }
  });

  it("le da sitio a la mascota sin sacarla de la ficha", async () => {
    await pintar("alimentos");
    const dibujo = screen.UNSAFE_root.findAllByType(MASCOTAS.alimentos)[0];

    // En absoluto no se medía contra la ficha: en web la imagen salía de 619
    // de ancho, se desbordaba sobre las fichas de al lado y quedaba tapada
    // por ellas. Como hijo normal de la columna eso no puede volver a pasar.
    const caja = cajaConAlto(dibujo);
    expect(caja.position).toBeUndefined();

    // El dibujo rellena la caja; el recorte del viewBox hace el resto.
    expect(dibujo.props.width).toBe("100%");
    expect(dibujo.props.height).toBe("100%");
  });

  it("mide lo mismo tenga la etiqueta una linea o dos", async () => {
    // 'Alimentos y Bebidas' y 'Hoteles y Alojamientos' no ocupan las mismas
    // lineas. Cuando la mascota crecia con el sobrante de la ficha, eso la
    // hacia 23 mas baja en una que en otra y cada una salia de un tamano.
    await pintar("alimentos");
    const una = cajaConAlto(screen.UNSAFE_root.findAllByType(MASCOTAS.alimentos)[0]);
    screen.unmount();

    await pintar("hoteles");
    const dos = cajaConAlto(screen.UNSAFE_root.findAllByType(MASCOTAS.hoteles)[0]);

    expect(una.height).toBe(dos.height);
    expect(typeof una.height).toBe("number");
    expect(una.flex).toBeUndefined();
  });

  it("sigue mostrando la etiqueta junto a la mascota", async () => {
    await pintar("alimentos");
    expect(screen.getByText("Alimentos y Bebidas")).toBeTruthy();
  });

  it("informacion ya lleva su gosito, no la letra dibujada a mano", async () => {
    await pintar("informacion");

    expect(screen.UNSAFE_root.findAllByType(MASCOTAS.informacion)).toHaveLength(1);
    expect(screen.getByText("Información y Servicios")).toBeTruthy();
  });

  it("la categoria que aun no tiene dibujo conserva su imagen y su alto", async () => {
    // Tiendas y Souvenirs sigue con el PNG. Lo que no puede pasar es que se
    // quede sin nada y su etiqueta suba respecto a las fichas vecinas.
    await pintar("alimentos");
    const conSvg = cajaConAlto(screen.UNSAFE_root.findAllByType(MASCOTAS.alimentos)[0]);
    screen.unmount();

    await pintar("tiendas");
    const imagenes = screen.UNSAFE_root.findAllByType(Image);
    const png = imagenes.find((i) => i.props.source === MASCOTAS_PNG.tiendas);

    expect(png).toBeTruthy();
    expect(png.props.resizeMode).toBe("contain");
    expect(cajaConAlto(png).height).toBe(conSvg.height);
  });

  it("cada mascota declarada corresponde a una categoria que existe", () => {
    const claves = CATEGORIES.map((c) => c.key);
    [...Object.keys(MASCOTAS), ...Object.keys(MASCOTAS_PNG)].forEach((clave) => {
      expect(claves).toContain(clave);
    });
  });

  it("no queda ninguna categoria sin dibujo", () => {
    // Una ficha vacia no rompe nada y por eso se cuela: aqui se nota.
    CATEGORIES.forEach((categoria) => {
      const tiene =
        Boolean(MASCOTAS[categoria.key]) || Boolean(MASCOTAS_PNG[categoria.key]);
      expect([categoria.key, tiene]).toEqual([categoria.key, true]);
    });
  });
});
