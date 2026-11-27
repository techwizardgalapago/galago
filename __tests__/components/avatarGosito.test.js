// El avatar de gosito del perfil: el catalogo, el circulo y el selector.

import { render, screen, fireEvent } from "@testing-library/react-native";
import { Image } from "react-native";

import {
  AVATARES,
  AVATAR_POR_DEFECTO,
  avatarPorClave,
  claveDeAvatar,
  tieneAvatarPropio,
} from "../../src/features/users/avatares";
import ProfileAvatarBadge from "../../src/components/profile/ProfileAvatarBadge";
import AvatarPicker from "../../src/components/profile/AvatarPicker";

const imagenesDe = (raiz) => raiz.findAllByType(Image).map((i) => i.props.source);

describe("catalogo de avatares", () => {
  it("no tiene dos gositos con la misma clave", () => {
    // Dos claves iguales harian que elegir uno marcase el otro, y el mapa
    // interno se quedaria con el ultimo en silencio.
    const claves = AVATARES.map((a) => a.clave);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("cada gosito trae nombre e imagen", () => {
    AVATARES.forEach((avatar) => {
      expect([avatar.clave, Boolean(avatar.nombre)]).toEqual([avatar.clave, true]);
      expect([avatar.clave, avatar.imagen != null]).toEqual([avatar.clave, true]);
    });
  });

  it("cae en el de por defecto ante cualquier clave que no exista", () => {
    const porDefecto = avatarPorClave(AVATAR_POR_DEFECTO);
    // Lo que se guarda es texto que viene de Airtable: puede llegar vacio,
    // nulo o con una clave vieja que ya se borro del catalogo. En ninguno de
    // esos casos el perfil puede quedarse sin dibujo.
    [undefined, null, "", "   ", "gosito-que-no-existe", 42].forEach((clave) => {
      expect(avatarPorClave(clave)).toBe(porDefecto);
    });
  });

  it("devuelve el gosito pedido cuando la clave existe, con espacios de sobra incluidos", () => {
    expect(avatarPorClave("surf").clave).toBe("surf");
    expect(avatarPorClave("  surf  ").clave).toBe("surf");
  });

  it("reconoce solo las claves que estan en el catalogo", () => {
    // Airtable guarda texto libre: una clave vieja o un dedazo no puede
    // pasar por buena, o el circulo se quedaria sin dibujo.
    expect(tieneAvatarPropio("surf")).toBe(true);
    expect(tieneAvatarPropio("")).toBe(false);
    expect(tieneAvatarPropio("gosito-que-no-existe")).toBe(false);
  });

  it("lee la clave del usuario y rellena con la de por defecto", () => {
    expect(claveDeAvatar({ userAvatar: "dive" })).toBe("dive");
    expect(claveDeAvatar({ userAvatar: "no-existe" })).toBe(AVATAR_POR_DEFECTO);
    expect(claveDeAvatar({})).toBe(AVATAR_POR_DEFECTO);
    expect(claveDeAvatar(null)).toBe(AVATAR_POR_DEFECTO);
  });
});

describe("el circulo del perfil", () => {
  it("pinta el gosito elegido", async () => {
    await render(<ProfileAvatarBadge avatarClave="dive" />);
    expect(imagenesDe(screen.UNSAFE_root)).toContain(avatarPorClave("dive").imagen);
  });

  it("nunca se queda vacio: sin eleccion pinta el de por defecto", async () => {
    // Antes el circulo salia siempre azul y liso porque no recibia nada.
    await render(<ProfileAvatarBadge />);
    expect(imagenesDe(screen.UNSAFE_root)).toContain(
      avatarPorClave(AVATAR_POR_DEFECTO).imagen
    );
  });

  it("recorta el dibujo al circulo", async () => {
    // Los gositos son mas anchos que altos: sin recortar, el dibujo asoma por
    // los lados del circulo y se ve cortado contra el borde.
    await render(<ProfileAvatarBadge avatarClave="surf" />);
    const imagen = screen.UNSAFE_root.findAllByType(Image)[0];
    expect(imagen.props.resizeMode).toBe("contain");

    let recorta = false;
    for (let n = imagen; n; n = n.parent) {
      const estilo = Array.isArray(n.props?.style)
        ? Object.assign({}, ...n.props.style.filter(Boolean))
        : n.props?.style;
      if (estilo?.overflow === "hidden") recorta = true;
    }
    expect(recorta).toBe(true);
  });

  it("solo se puede tocar si hay algo que hacer al tocarlo", async () => {
    const { rerender } = await render(<ProfileAvatarBadge avatarClave="surf" />);
    expect(screen.queryByRole("button")).toBeNull();

    await rerender(<ProfileAvatarBadge avatarClave="surf" onPress={() => {}} />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("avisa que se puede cambiar y dice cual lleva puesto", async () => {
    await render(<ProfileAvatarBadge avatarClave="party" onPress={() => {}} />);
    const boton = screen.getByRole("button");
    expect(boton.props.accessibilityLabel).toContain("Go Party");
    expect(boton.props.accessibilityLabel).toMatch(/cambiar/i);
  });
});

describe("el selector de gosito", () => {
  const abrir = async (props = {}) =>
    render(
      <AvatarPicker
        visible
        avatarClave={AVATAR_POR_DEFECTO}
        onSelect={() => {}}
        onClose={() => {}}
        {...props}
      />
    );

  it("ofrece todos los gositos del catalogo", async () => {
    await abrir();
    AVATARES.forEach((avatar) => {
      expect(screen.getByLabelText(avatar.nombre)).toBeTruthy();
    });
  });

  it("devuelve la clave del que se toca", async () => {
    const onSelect = jest.fn();
    await abrir({ onSelect });

    fireEvent.press(screen.getByLabelText("Go Snorkel"));

    expect(onSelect).toHaveBeenCalledWith("snorkel");
  });

  it("marca el que ya lleva puesto y solo ese", async () => {
    await abrir({ avatarClave: "music" });

    const marcados = AVATARES.filter(
      (a) => screen.getByLabelText(a.nombre).props.accessibilityState?.selected
    );
    expect(marcados.map((a) => a.clave)).toEqual(["music"]);
  });

  it("no pinta nada cuando esta cerrado", async () => {
    await render(
      <AvatarPicker
        visible={false}
        avatarClave="surf"
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.queryByLabelText("Go Surf")).toBeNull();
  });
});
