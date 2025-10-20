import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="register/index"
        options={{
          title: 'Complete your profile',
          headerBackTitle: 'Settings',
        }}
      />
    </Stack>
  );
}
