// src/app/settings.js
import { Stack, router } from "expo-router";
import { View, Text, Button } from "react-native";
import { useAuth } from "../../../hooks/useAuth";

import Container from "../../../components/Container";

export default function SettingsScreen() {
  const { doLogout } = useAuth();

  const handleLogout = async () => {
    console.log("🔘 Logout pressed");
    try {
      await doLogout();             // clears token, redux, header
      router.replace("/(auth)/login"); // jump to login
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return (
    <>
      <Container>
        <Stack.Screen options={{ title: "Settings" }} />
        <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>Account</Text>
          <Button title="Log out" onPress={handleLogout} />
        </View>
      </Container>
    </>
  );
}
