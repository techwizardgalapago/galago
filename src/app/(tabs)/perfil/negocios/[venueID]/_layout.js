import { Stack, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { selectVenueByIdFromState } from "../../../../../store/slices/venueSlice";

export default function VenueLayout() {
  const { venueID } = useLocalSearchParams();
  const venue = useSelector((s) => selectVenueByIdFromState(s, venueID));
  const title = venue?.venueName || "Negocio";

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="editar/index" 
        options={{ title: "Editar negocio" }} 
      />
    </Stack>
  );
}
