import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name='hoy-en-la-isla/index'
        options={{ title: "Hoy", tabBarLabel: "Hoy" }}
      />
      <Tabs.Screen
        name='perfil/index'
        options={{ title: "Perfil", tabBarLabel: "Perfil" }}
      />
    </Tabs>
  );
}
