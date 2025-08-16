import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";
import Constants from "expo-constants";

export default function DebugTab() {
  // Use Expo's way to check if in development
  const isDev = __DEV__ || Constants.expoConfig?.extra?.isDev !== false;

  if (!isDev) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Debug tools only available in development</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 20 }}>
        🔧 Debug Tools
      </Text>

      <Link href='/debug/sync-test' asChild>
        <Pressable
          style={{
            backgroundColor: "#007AFF",
            padding: 15,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            🔄 Sync Test Screen
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
