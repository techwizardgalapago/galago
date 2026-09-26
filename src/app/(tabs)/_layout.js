import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Contorno cuando la pestaña esta inactiva y solido en la actual, que es la
// convencion de iOS y Android: marca donde estas sin depender solo del color.
const icono = (base) => {
  const IconoPestana = ({ color, size, focused }) => (
    <Ionicons name={focused ? base : `${base}-outline`} size={size} color={color} />
  );
  IconoPestana.displayName = `IconoPestana(${base})`;
  return IconoPestana;
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        // Sin fondo propio: lo pinta el desenfoque de abajo.
        //
        // react-navigation monta este elemento con StyleSheet.absoluteFill,
        // y un hijo absoluto se posiciona DENTRO del padding del contenedor.
        // Como la barra reserva insets.bottom para el area de gestos de
        // Android, el desenfoque se quedaba corto y esa franja aparecia sin
        // cubrir. Se extiende por debajo del padding.
        // Solo en iOS, donde el desenfoque es nativo y no cuesta nada.
        //
        // En Android habria que pedir experimentalBlurMethod, que redibuja la
        // jerarquia de vistas para desenfocarla: eso dejaba toda la app con un
        // tinte blanco y colgaba el detalle de un local en una pantalla en
        // blanco. Ahi basta el fondo translucido de la propia barra.
        tabBarBackground:
          Platform.OS === "ios"
            ? () => (
                <BlurView
                  intensity={40}
                  tint="light"
                  style={[StyleSheet.absoluteFill, { bottom: -insets.bottom }]}
                />
              )
            : undefined,
      }}
    >
      <Tabs.Screen
        name='hoy-en-la-isla'
        options={{
          title: "Hoy",
          tabBarLabel: "Hoy",
          tabBarIcon: icono("today"),
        }}
      />
      <Tabs.Screen
        name='locales'
        options={{
          title: "Locales",
          tabBarLabel: "Locales",
          tabBarIcon: icono("storefront"),
        }}
      />
      <Tabs.Screen
        name='perfil'
        options={{
          title: "Perfil",
          tabBarLabel: "Perfil",
          tabBarIcon: icono("person"),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{ title: 'Settings', tabBarLabel: "Settings", href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    // Flota sobre el contenido para que el desenfoque tenga algo que
    // desenfocar. Lo que hay debajo se tapa, por eso cada scroll reserva
    // espacio al final con useTabBarInset.
    position: "absolute",
    // Fondo translucido propio del contenedor, no de un hijo absoluto: cubre
    // tambien el relleno inferior del area de gestos, donde el desenfoque no
    // llega. Sin esto quedaba una franja sin cubrir.
    backgroundColor: "rgba(253,253,252,0.82)",
    borderTopColor: "rgba(0,0,0,0.06)",
    // Mismo ancho que la columna de contenido (720). Con position absolute
    // alignSelf no aplica: se centra con left/right a 0 y margenes auto.
    left: 0,
    right: 0,
    marginHorizontal: "auto",
    maxWidth: 720,
  },
});
