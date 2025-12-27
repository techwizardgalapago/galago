import { Stack } from "expo-router";
import { ActivityIndicator, View, Text } from "react-native";
import { Provider } from "react-redux";
import { store } from "../store";
import { useAppInitializer } from "../hooks/useAppInitializer";
import { useAuthGuard } from "../hooks/useAuthGuard";

function RootAppLayout() {
  const { ready, syncing } = useAppInitializer();
  useAuthGuard();

  return (
    <>
      {!ready && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0B0F14",
            zIndex: 999,
          }}
        >
          <ActivityIndicator />
        </View>
      )}
      {syncing && (
        <View
          style={{
            position: "absolute",
            top: 50,
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <ActivityIndicator size='small' color='#000' />
          <Text style={{ marginTop: 4 }}>Syncing data…</Text>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Expo Router will auto-register  child routes */}
        {/* <Stack.Screen name='(tabs)' options={{ headerShown: false }} /> */}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootAppLayout />
    </Provider>
  );
}
