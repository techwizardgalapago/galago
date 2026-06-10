import { Stack } from 'expo-router';

export default function EventosLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="crear/index" options={{ title: 'Nuevo evento' }} />
      <Stack.Screen name="crear/confirmacion" options={{ headerShown: false }} />
      <Stack.Screen name="[eventID]" options={{ headerShown: false }} />
    </Stack>
  );
}
