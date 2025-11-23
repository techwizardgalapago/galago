// src/app/(tabs)/perfil/index.js
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import Container from "../../../components/Container"; // adjust path if needed

export default function PerfilScreen() {
  return (
    <Container>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 12 }}>
        Perfil
      </Text>

      <View style={{ gap: 12 }}>
        <Pressable
          onPress={() => router.push("/(tabs)/perfil/settings")}
          style={{ padding: 12, backgroundColor: "#111", borderRadius: 12 }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "700",
            }}
          >
            Settings
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/perfil/negocios")}
          style={{ padding: 12, backgroundColor: "#0a6", borderRadius: 12 }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "700",
            }}
          >
            Mis negocios
          </Text>
        </Pressable>
      </View>
    </Container>
  );
}
