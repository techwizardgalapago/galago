import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";

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
        options={{ title: "Hoy", tabBarLabel: "Hoy" }}
      />
      <Tabs.Screen
        name='locales'
        options={{ title: "Locales", tabBarLabel: "Locales" }}
      />
      <Tabs.Screen
        name='perfil'
        options={{ title: "Perfil", tabBarLabel: "Perfil" }}
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
