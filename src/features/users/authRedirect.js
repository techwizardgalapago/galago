// Decide a donde debe ir el usuario segun su sesion y la ruta actual.
//
// Se separa del hook para poder probarla: aqui vivia un bug que dejaba la app
// dando vueltas. usePathname() de expo-router QUITA los segmentos de grupo, asi
// que devuelve "/perfil/settings/register" y nunca "/(tabs)/perfil/...". Al
// comparar contra la forma con grupo, el guard creia que nunca estabas en la
// pantalla de completar perfil y redirigia a ella una y otra vez.
//
// De ahi la distincion: HREF es para navegar, ROUTE es para comparar.

import { isProfileComplete } from "./profileComplition";

export const LOGIN_HREF = "/(auth)/login";
export const REGISTER_HREF = "/(tabs)/perfil/settings/register";

// Tal como las devuelve usePathname(), sin grupos.
export const REGISTER_ROUTE = "/perfil/settings/register";
const RUTAS_PUBLICAS = new Set(["/login", "/auth/callback", "/callback"]);

export const esRutaPublica = (pathname, segments = []) =>
  RUTAS_PUBLICAS.has(pathname) || segments[0] === "(auth)";

export const esRutaDeRegistro = (pathname) =>
  typeof pathname === "string" &&
  (pathname === REGISTER_ROUTE || pathname.endsWith(REGISTER_ROUTE));

/**
 * Devuelve la ruta a la que redirigir, o null si hay que quedarse donde se
 * esta. Nunca devuelve la ruta actual: eso provocaria el bucle.
 */
export const decideRedirect = ({
  hydrated,
  token,
  user,
  pathname,
  segments = [],
}) => {
  if (!hydrated) return null;

  const publica = esRutaPublica(pathname, segments);

  // Sin sesion: solo se permiten las rutas publicas.
  if (!token) return publica ? null : LOGIN_HREF;

  // Con sesion pero sin usuario todavia: esperar a que llegue, sin mover al
  // usuario de sitio.
  if (!user) return null;

  const incompleto = !isProfileComplete(user);

  if (incompleto) {
    // Ya esta completando el perfil: dejarlo en paz.
    return esRutaDeRegistro(pathname) ? null : REGISTER_HREF;
  }

  // Perfil completo y en una pantalla de login: adentro.
  return publica ? "/" : null;
};
