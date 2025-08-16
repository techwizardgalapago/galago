import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabLayout() {
  const isDev = __DEV__;

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
      {isDev && (
        <Tabs.Screen
          name='debug'
          options={{
            title: "Debug",
            tabBarIcon: ({ color }) => <Text style={{ color }}>🔧</Text>,
          }}
        />
      )}
    </Tabs>
  );
}
