import { View, Text, Pressable, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { router } from 'expo-router';

// Si tienes selectores de venues, puedes usarlos aquí
// import { selectVenueById } from '../../../../store/slices/venueSlice';

export default function MisNegociosScreen() {
  const authUser = useSelector(s => s.auth?.user);
  const userVenueIds = authUser?.userVenues || []; // si tu backend llena esto en /auth/me

  // Si tienes un slice de venues y están cargados:
  // const venues = useSelector(s => userVenueIds.map(id => selectVenueById(s, id)).filter(Boolean));

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>Mis negocios</Text>
        <Pressable
          onPress={() => router.push('/(tabs)/perfil/negocios/crear')}
          style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#111', borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>Registrar negocio</Text>
        </Pressable>
      </View>

      {/* Si tienes venues en Redux, renderízalos aquí. Si aún no, deja un placeholder */}
      {userVenueIds.length === 0 ? (
        <View style={{ paddingVertical: 24 }}>
          <Text style={{ opacity: 0.6 }}>Aún no tienes negocios registrados.</Text>
        </View>
      ) : (
        <FlatList
          data={userVenueIds}
          keyExtractor={(id) => id}
          renderItem={({ item }) => (
            <View style={{ padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginTop: 10 }}>
              <Text style={{ fontWeight: '700' }}>{item}</Text>
              <Text style={{ opacity: 0.7, marginTop: 4 }}>ID del venue</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
