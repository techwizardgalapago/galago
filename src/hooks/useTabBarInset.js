// La barra de pestañas flota sobre el contenido (position: absolute) para que
// el desenfoque tenga algo que desenfocar. A cambio, lo que haya al final de
// un scroll queda tapado: cada contenedor con scroll vertical tiene que
// reservar esta altura al final.
//
// useBottomTabBarHeight ya incluye el area segura inferior, asi que sirve
// igual en un iPhone con barra de gestos que en un Android sin ella.

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const RESPALDO = 64;

export const useTabBarInset = () => {
  try {
    return useBottomTabBarHeight();
  } catch {
    // Fuera de un navegador de pestañas el hook lanza. Devolvemos algo
    // razonable en vez de romper la pantalla.
    return RESPALDO;
  }
};
