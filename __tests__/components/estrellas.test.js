// Las estrellas de calificacion.
//
// La logica del reparto se prueba aparte, en __tests__/logic/rating.test.js.
// Aqui solo se comprueba lo que esa prueba no puede ver: que las estrellas
// llegan al arbol pintado y que la lista las muestra.

import { render, screen } from "@testing-library/react-native";
import { Ionicons } from "@expo/vector-icons";

import Estrellas from "../../src/components/Estrellas";
import PlaceCard from "../../src/components/profile/PlaceCard";
import { RATING_PROVISIONAL } from "../../src/features/venues/rating";

const nombresDeIconos = () =>
  screen.UNSAFE_root.findAllByType(Ionicons).map((i) => i.props.name);

describe("Estrellas", () => {
  it("pinta cinco llenas con la calificacion provisional", async () => {
    await render(<Estrellas rating={RATING_PROVISIONAL} />);

    expect(nombresDeIconos()).toEqual([
      "star",
      "star",
      "star",
      "star",
      "star",
    ]);
  });

  it("pinta siempre cinco, aunque la nota sea baja", async () => {
    await render(<Estrellas rating={1.5} />);

    const iconos = nombresDeIconos();
    expect(iconos).toHaveLength(5);
    expect(iconos).toEqual([
      "star",
      "star-half",
      "star-outline",
      "star-outline",
      "star-outline",
    ]);
  });

  it("escribe la nota al lado", async () => {
    await render(<Estrellas rating={4.5} />);
    expect(screen.getByText("4,5")).toBeTruthy();
  });

  it("se puede pedir sin el numero", async () => {
    await render(<Estrellas rating={5} mostrarNumero={false} />);
    expect(screen.queryByText("5")).toBeNull();
    expect(nombresDeIconos()).toHaveLength(5);
  });

  it("dice la calificacion de una vez a un lector de pantalla", async () => {
    // Cinco iconos seguidos no se leen uno a uno: la fila lleva la etiqueta.
    await render(<Estrellas rating={5} />);
    expect(screen.getByLabelText("Calificación 5 de 5")).toBeTruthy();
  });

  it("dice cuantas personas han opinado", async () => {
    await render(<Estrellas rating={4.5} conteo={12} />);
    expect(screen.getByText("4,5")).toBeTruthy();
    expect(screen.getByText("(12)")).toBeTruthy();
  });

  it("no escribe '(0)' cuando todavia no ha opinado nadie", async () => {
    // Con la nota provisional el conteo es cero; un '(0)' al lado de cinco
    // estrellas se lee como un error.
    await render(<Estrellas rating={5} conteo={0} />);
    expect(screen.queryByText("(0)")).toBeNull();
  });

  it("no pinta nada sin calificacion", async () => {
    await render(<Estrellas rating={null} />);
    expect(nombresDeIconos()).toHaveLength(0);
  });
});

describe("PlaceCard", () => {
  it("muestra las estrellas del local en la lista", async () => {
    await render(
      <PlaceCard title="Ahonui" location="Isla Santa Cruz" rating={RATING_PROVISIONAL} />
    );

    expect(nombresDeIconos()).toHaveLength(5);
    expect(screen.getByText("Ahonui")).toBeTruthy();
  });

  it("lleva el conteo a la tarjeta de la lista", async () => {
    await render(
      <PlaceCard title="Ahonui" location="Isla Santa Cruz" rating={4} ratingCount={7} />
    );
    expect(screen.getByText("(7)")).toBeTruthy();
  });

  it("no inventa estrellas cuando no le pasan calificacion", async () => {
    await render(<PlaceCard title="Ahonui" location="Isla Santa Cruz" />);
    expect(nombresDeIconos()).toHaveLength(0);
  });

  it("trata el cero como una nota y no como un hueco", async () => {
    // Con el '{rating ?' de antes, un cero desaparecia de la tarjeta.
    await render(<PlaceCard title="Ahonui" location="Isla Santa Cruz" rating={0} />);
    expect(nombresDeIconos()).toEqual([
      "star-outline",
      "star-outline",
      "star-outline",
      "star-outline",
      "star-outline",
    ]);
  });
});
