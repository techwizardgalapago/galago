// src/app/(tabs)/perfil/negocios/index.js
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';

import AuthBackground from '../../../../components/auth/AuthBackground';
import AuthCard from '../../../../components/auth/AuthCard';
import AuthButton from '../../../../components/auth/AuthButton';
import PlaceCard from '../../../../components/profile/PlaceCard';
import ProfileEventCard from '../../../../components/profile/ProfileEventCard';
import { useNetworkStatus } from '../../../../hooks/useNetwork';
import {
  fetchVenues,
  fetchUserVenuesRemote,
  fetchUserVenuesByUserId,
} from '../../../../store/slices/venueSlice';

const isWeb = Platform.OS === 'web';

const blurActive = () => {
  if (!isWeb) return;
  const el = typeof document !== 'undefined' ? document.activeElement : null;
  if (el && typeof el.blur === 'function') el.blur();
};

const Header = () => (
  <View style={{ alignItems: 'center', flexDirection: 'row', paddingHorizontal: 30 }}>
    <Text style={{ fontSize: 20, fontWeight: '500', color: '#1B2222', flex: 1 }}>
      Gestiona Tus Negocios
    </Text>
    <Pressable
      onPress={() => router.push('/(tabs)/perfil')}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F2F2F2',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 18, color: '#111' }}>×</Text>
    </Pressable>
  </View>
);

const getVenueImageUrl = (venue) => {
  let firstImage = null;
  try {
    if (Array.isArray(venue?.venueImage)) {
      firstImage = venue.venueImage[0] || null;
    } else if (typeof venue?.venueImage === 'string' && venue.venueImage.trim()) {
      const parsed = JSON.parse(venue.venueImage);
      if (Array.isArray(parsed)) firstImage = parsed[0] || null;
    }
  } catch {
    return null;
  }

  return firstImage?.thumbnails?.large?.url || firstImage?.url || null;
};

export default function MisNegociosScreen() {
  const dispatch = useDispatch();
  const authUser = useSelector((s) => s.auth?.user);
  const userVenueIds = authUser?.userVenues || [];
  const { list: venues, status } = useSelector((s) => s.venues);
  const isOnline = useNetworkStatus();
  const userID = authUser?.userID;
  const lastRemoteKeyRef = useRef('');
  const [containerHeight, setContainerHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const topGap = 108;
  const availableHeight = containerHeight || windowHeight;
  const cardHeight = Math.max(availableHeight - topGap, 0);

  useEffect(() => {
    const idsKey = userVenueIds.join('|');
    if (!isOnline) return;

    if (userVenueIds.length && idsKey !== lastRemoteKeyRef.current) {
      lastRemoteKeyRef.current = idsKey;
      dispatch(fetchUserVenuesRemote(userVenueIds));
      return;
    }

    if (!userVenueIds.length && userID && idsKey !== lastRemoteKeyRef.current) {
      lastRemoteKeyRef.current = userID;
      dispatch(fetchUserVenuesByUserId(userID));
    }
  }, [dispatch, userVenueIds, isOnline, userID]);

  useEffect(() => {
    if (isWeb) return;
    if (isOnline && userVenueIds.length) return;
    if (status === 'idle') {
      dispatch(fetchVenues());
    }
  }, [dispatch, status, isOnline, userVenueIds.length]);

  // Debug log only when ids change
  useEffect(() => {
    const key = (venues || []).map((v) => v.venueID).join('|');
    if (key) {
      console.log('MisNegociosScreen - venues from state:', venues);
    }
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

  const isLoading = status === 'loading';
  const isEmpty = !isLoading && myVenues.length === 0;

  return (
    <AuthBackground>
      <View
        style={{ flex: 1, justifyContent: 'flex-end' }}
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        <AuthCard
          style={{
            height: cardHeight,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            paddingTop: 30,
            paddingBottom: 24,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 50, paddingBottom: 24 }}>
            <Header />

            {isLoading && (
              <View style={{ paddingHorizontal: 30 }}>
                <ActivityIndicator />
              </View>
            )}

            {isEmpty ? (
              <View style={{ paddingHorizontal: 30 }}>
                <Text style={{ opacity: 0.6 }}>
                  Aún no tienes negocios registrados.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 28 }}>
                <View style={{ gap: 18 }}>
                  {myVenues.map((item) => (
                    <Pressable
                      key={item.venueID}
                      onPress={() => {
                        blurActive();
                        router.push(`/(tabs)/perfil/negocios/${item.venueID}`);
                      }}
                    >
                      <PlaceCard
                        imageUri={getVenueImageUrl(item)}
                        title={item.venueName || 'Sin nombre'}
                        location={item.venueLocation || ''}
                        rating="4.0"
                        category={item.venueCategory || 'Ecuatoriana'}
                        price="$$$$"
                      />
                    </Pressable>
                  ))}
                </View>
                <View style={{ paddingHorizontal: 30 }}>
                  <Text style={{ fontSize: 20, fontWeight: '500', color: '#1B2222' }}>
                    Eventos Organizados Por Ti
                  </Text>
                </View>
                <ProfileEventCard
                  time="25 MAR — MARTES, 15:00"
                  title="Festival de Arte en la Playa"
                  location="La Nube, Isla Santa Cruz"
                  tags={['#exhibiciones', '#aire libre', '#talleres']}
                />
              </View>
            )}

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                paddingHorizontal: 30,
                justifyContent: 'center',
              }}
            >
              <AuthButton
                label="Nuevo evento"
                onPress={() => router.push('/(tabs)/perfil/negocios/crear')}
                style={{ flex: 1, backgroundColor: '#F26719' }}
                textStyle={{ color: 'white' }}
              />
              <AuthButton
                label="Registrar negocio"
                onPress={() => router.push('/(tabs)/perfil/negocios/crear')}
                style={{ flex: 1, backgroundColor: '#EDEDEC' }}
                textStyle={{ color: '#1B2222' }}
              />
            </View>
          </ScrollView>
        </AuthCard>
      </View>
    </AuthBackground>
  );
}
