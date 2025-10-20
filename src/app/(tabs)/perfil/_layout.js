import { Stack } from 'expo-router';

export default function PerfilLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{ title: 'Perfil' }}
      />
      {/* Settings is a nested folder; it will have its own Stack */}
    </Stack>
  );
}
