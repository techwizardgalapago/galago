import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { store } from "../store";
import { useAppInitializer } from "../hooks/useAppInitializer";
import { ActivityIndicator, View, Text } from "react-native";

function RootAppLayout() {
  const { ready, syncing } = useAppInitializer();

  if (!ready) return null;

  return (
    <>
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
      <Stack>
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
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
