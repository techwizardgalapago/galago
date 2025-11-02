import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabLayout() {
  const isDev = __DEV__;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name='hoy-en-la-isla/index'
        options={{ title: "Hoy", tabBarLabel: "Hoy" }}
      />
      <Tabs.Screen
        name='perfil'
        options={{ title: "Perfil", tabBarLabel: "Perfil" }}
      />
      <Tabs.Screen 
        name="settings/index" options={{ title: 'Settings', tabBarLabel: "Settings" }} 
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
