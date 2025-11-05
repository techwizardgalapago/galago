// src/app/(tabs)/perfil/negocios/index.js
import { useEffect, useMemo } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';
import { fetchVenues, fetchUserVenuesRemote } from '../../../../store/slices/venueSlice';

const isWeb = Platform.OS === 'web';
const blurActive = () => {
  if (!isWeb) return;
  const el = typeof document !== 'undefined' ? document.activeElement : null;
  if (el && typeof el.blur === 'function') el.blur();
};

export default function MisNegociosScreen() {
  const dispatch = useDispatch();
  const authUser = useSelector((s) => s.auth?.user);
  const userVenueIds = authUser?.userVenues || [];
  const { list: venues, status } = useSelector((s) => s.venues);

  // Fetch strategy:
  // - Web: fetch from backend by IDs (no SQLite)
  // - Native: fetch from SQLite
  useEffect(() => {
    if (isWeb) {
      if (status === 'idle' && userVenueIds.length) {
        dispatch(fetchUserVenuesRemote(userVenueIds));
      }
    } else {
      if (status === 'idle') {
        dispatch(fetchVenues());
      }
    }
  }, [dispatch, status, isWeb, userVenueIds.join('|')]);

  // Log only when the set of venueIDs changes
  useEffect(() => {
    const key = (venues || []).map((v) => v.venueID).join('|');
    if (key) console.log('MisNegociosScreen - venues from state:', venues);
  }, [(venues || []).map((v) => v.venueID).join('|')]);

  // Robust filter: userID can be array or string
  const myVenues = useMemo(() => {
    const uid = authUser?.userID;
    if (!uid) return [];
    return (venues || []).filter((v) => {
      const val = v?.userID;
      if (Array.isArray(val)) return val.includes(uid);
      return val === uid;
    });
  }, [venues, authUser?.userID]);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>Mis negocios</Text>
        <Pressable
          onPress={() => {
            blurActive();
            router.push('/(tabs)/perfil/negocios/crear');
          }}
          style={{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#111', borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>Registrar negocio</Text>
        </Pressable>
      </View>

      {status === 'loading' && (
        <View style={{ paddingVertical: 24 }}>
          <ActivityIndicator />
        </View>
      )}

      {status !== 'loading' && myVenues.length === 0 ? (
        <View style={{ paddingVertical: 24 }}>
          <Text style={{ opacity: 0.6 }}>Aún no tienes negocios registrados.</Text>
        </View>
      ) : (
        <FlatList
          data={myVenues}
          keyExtractor={(v) => v.venueID}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                blurActive();
                router.push(`/(tabs)/perfil/negocios/${item.venueID}`);
              }}
              style={{ padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginTop: 10 }}
            >
              <Text style={{ fontWeight: '700', fontSize: 16 }}>
                {item.venueName || 'Sin nombre'}
              </Text>
              <Text style={{ opacity: 0.8 }}>
                {item.venueCategory} · {item.venueLocation}
              </Text>
              {!!item.venueContact && (
                <Text style={{ opacity: 0.8, marginTop: 2 }}>{item.venueContact}</Text>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
