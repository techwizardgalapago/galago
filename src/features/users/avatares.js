// Los gositos que la gente puede ponerse de avatar.
//
// Lo que se guarda en el perfil es la CLAVE ('surf'), no una URL ni la imagen.
// Asi el dibujo viaja dentro de la app: se puede redibujar, recortar o cambiar
// de formato sin tocar un solo dato guardado, y el avatar se ve sin conexion y
// sin pedir nada a la red. A cambio, una clave que ya no exista en el catalogo
// deja de tener dibujo, y por eso `avatarPorClave` siempre cae en el de por
// defecto en vez de devolver nada.
//
// Son los gositos de actividad, no los de categoria: estos dicen algo de quien
// los lleva, que es para lo que sirve un avatar.

export const AVATAR_POR_DEFECTO = "hike";

export const AVATARES = [
  { clave: "hike", nombre: "Go Hike", imagen: require("../../../assets/gositos/go-hike.png") },
  { clave: "surf", nombre: "Go Surf", imagen: require("../../../assets/gositos/go-surf.png") },
  { clave: "snorkel", nombre: "Go Snorkel", imagen: require("../../../assets/gositos/go-snorkel.png") },
  { clave: "dive", nombre: "Go Dive", imagen: require("../../../assets/gositos/go-dive.png") },
  { clave: "futbol", nombre: "Go Fútbol", imagen: require("../../../assets/gositos/go-futbol.png") },
  { clave: "voley", nombre: "Go Vóley", imagen: require("../../../assets/gositos/go-voley.png") },
  { clave: "food", nombre: "Go Food", imagen: require("../../../assets/gositos/go-food.png") },
  { clave: "drinks", nombre: "Go Drinks", imagen: require("../../../assets/gositos/go-drinks.png") },
  { clave: "music", nombre: "Go Music", imagen: require("../../../assets/gositos/go-music.png") },
  { clave: "party", nombre: "Go Party", imagen: require("../../../assets/gositos/go-party.png") },
];

const PORCLAVE = AVATARES.reduce((mapa, avatar) => {
  mapa[avatar.clave] = avatar;
  return mapa;
}, {});

// El de por defecto tiene que existir de verdad: si alguien renombra una clave
// del catalogo y se olvida de esta constante, el perfil se quedaria sin avatar
// y el fallo solo se veria abriendo la app.
if (!PORCLAVE[AVATAR_POR_DEFECTO]) {
  throw new Error(
    `AVATAR_POR_DEFECTO '${AVATAR_POR_DEFECTO}' no esta en el catalogo de avatares`
  );
}

export const avatarPorClave = (clave) =>
  PORCLAVE[String(clave ?? "").trim()] ?? PORCLAVE[AVATAR_POR_DEFECTO];

// Si la clave existe de verdad en el catalogo. El selector marca el gosito que
// se esta viendo, sea elegido o el de por defecto, porque es lo que hay puesto;
// esto sirve para no confundir una clave vieja de Airtable con una buena.
export const tieneAvatarPropio = (clave) =>
  Boolean(PORCLAVE[String(clave ?? "").trim()]);

export const claveDeAvatar = (usuario) => {
  const guardada = String(usuario?.userAvatar ?? "").trim();
  return tieneAvatarPropio(guardada) ? guardada : AVATAR_POR_DEFECTO;
};
