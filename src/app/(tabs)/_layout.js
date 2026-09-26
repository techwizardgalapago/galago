import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
    // Mismo ancho que la columna de contenido (720). Sin esto, en pantallas
    // anchas las tres pestañas se reparten todo el navegador y quedan
    // separadisimas. En movil la pantalla es mas estrecha, asi que no aplica.
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
});
