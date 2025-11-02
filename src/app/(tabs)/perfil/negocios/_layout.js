import { Stack } from 'expo-router';

export default function NegociosLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Mis negocios' }} />
      <Stack.Screen name="crear/index" options={{ title: 'Registra tu negocio', headerBackTitle: 'Mis negocios' }} />
    </Stack>
  );
}
