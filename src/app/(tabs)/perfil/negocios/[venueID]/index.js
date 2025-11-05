// src/app/(tabs)/perfil/negocios/[venueID]/index.js
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectVenueByIdFromState } from '../../../../../store/slices/venueSlice';

export default function VenueDetailScreen() {
  const { venueID } = useLocalSearchParams();
  const venue = useSelector((s) => selectVenueByIdFromState(s, venueID));
  console.log('VenueDetailScreen - venue from state:', venue);

  if (!venue) {
    return <View style={{ padding: 16 }}><Text>No se encontró el negocio.</Text></View>;
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>{venue.venueName}</Text>
      <Text>{venue.venueCategory} · {venue.venueLocation}</Text>
      {!!venue.venueAddress && <Text>{venue.venueAddress}</Text>}
      {!!venue.venueContact && <Text>📞 {venue.venueContact}</Text>}
      {!!venue.venueDescription && <Text style={{ marginTop: 8 }}>{venue.venueDescription}</Text>}

      <Pressable
        onPress={() => router.push(`/(tabs)/perfil/negocios/${venueID}/editar`)}
        style={{ marginTop: 16, padding: 12, backgroundColor: '#111', borderRadius: 12 }}
      >
        <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>Editar</Text>
      </Pressable>
    </View>
  );
}
