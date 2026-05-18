import { Stack } from 'expo-router';

export default function EventoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="editar/index" options={{ title: 'Editar evento' }} />
    </Stack>
  );
}
