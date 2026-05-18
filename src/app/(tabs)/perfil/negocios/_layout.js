import { Stack } from 'expo-router';

export default function NegociosLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Mis negocios' }} />
      <Stack.Screen name="crear/index" options={{ title: 'Registra tu negocio', headerBackTitle: 'Mis negocios' }} />
      {/* 👇 Cuando entres a /negocios/[venueID], ocultamos el header de este Stack */}
      <Stack.Screen
        name="[venueID]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="eventos"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
