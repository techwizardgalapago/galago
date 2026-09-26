import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        // Sin fondo propio: lo pinta el desenfoque de abajo.
        tabBarBackground: () => (
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        ),
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
    backgroundColor: "transparent",
    borderTopColor: "rgba(0,0,0,0.06)",
    // Mismo ancho que la columna de contenido (720). Con position absolute
    // alignSelf no aplica: se centra con left/right a 0 y margenes auto.
    left: 0,
    right: 0,
    marginHorizontal: "auto",
    maxWidth: 720,
  },
});
