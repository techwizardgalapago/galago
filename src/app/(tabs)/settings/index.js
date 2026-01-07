// src/app/settings.js
import { Stack, router } from "expo-router";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useAuth } from "../../../hooks/useAuth";

import AuthBackground from "../../../components/auth/AuthBackground";
import AuthCard from "../../../components/auth/AuthCard";

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
    <AuthBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <AuthCard style={styles.card}>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Ajustes</Text>
          </View>
          <View style={styles.body}>
            <Pressable style={styles.outlineButton} onPress={handleLogout}>
              <Text style={styles.outlineButtonText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </AuthCard>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 52,
    alignItems: Platform.OS === "web" ? "center" : "stretch",
  },
  card: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 393 : undefined,
    alignItems: "center",
    borderRadius: 20,
    paddingTop: 30,
    paddingBottom: 40,
    gap: 34,
    flex: 1,
  },
  headerBlock: {
    width: "100%",
    paddingHorizontal: 25,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "600",
    color: "#1B2222",
    textAlign: "center",
  },
  body: {
    width: "100%",
    alignItems: "center",
    gap: 18,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#1B2222",
    textAlign: "left",
    width: "100%",
    maxWidth: 333,
  },
  outlineButton: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 80,
    width: 200,
    backgroundColor: "#FDFDFC",
    borderWidth: 2,
    borderColor: "#383A3A",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#383A3A",
  },
});
