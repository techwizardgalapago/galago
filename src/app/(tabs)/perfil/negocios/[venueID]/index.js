// src/app/(tabs)/perfil/negocios/[venueID]/index.js
import React, { useMemo } from 'react';
import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectVenueByIdFromState } from '../../../../../store/slices/venueSlice';
import Container from '../../../../../components/Container'; // ⬅️ adjust if your path is different

const WEEKDAYS_ORDER = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

export default function VenueDetailScreen() {
  const { venueID } = useLocalSearchParams();
  const venue = useSelector((s) => selectVenueByIdFromState(s, venueID));
  console.log('VenueDetailScreen - venue from state:', venue);

  if (!venue) {
    return (
      <Container centered>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ opacity: 0.7 }}>No se encontró el negocio.</Text>
        </View>
      </Container>
    );
  }

  // --- Imagen principal (maneja array o string JSON) ---
  let firstImage = null;
  try {
    if (Array.isArray(venue.venueImage)) {
      firstImage = venue.venueImage[0] || null;
    } else if (typeof venue.venueImage === 'string' && venue.venueImage.trim()) {
      const parsed = JSON.parse(venue.venueImage);
      if (Array.isArray(parsed)) firstImage = parsed[0] || null;
    }
  } catch (e) {
    console.warn('No se pudo parsear venueImage:', e);
  }

  const imageUrl =
    firstImage?.thumbnails?.large?.url ||
    firstImage?.url ||
    null;

  // --- Normalizar horarios si existen ---
  const normalizedSchedules = useMemo(() => {
    const raw = venue.VenueSchedules || [];
    const asObjects = raw.map((r) => (r?.fields ? r.fields : r));

    const orderMap = WEEKDAYS_ORDER.reduce((acc, d, idx) => {
      acc[d] = idx;
      return acc;
    }, {});

    return [...asObjects].sort((a, b) => {
      const da = orderMap[a.weekDay] ?? 99;
      const db = orderMap[b.weekDay] ?? 99;
      if (da !== db) return da - db;
      return (a.openingTime_ || '').localeCompare(b.openingTime_ || '');
    });
  }, [venue.VenueSchedules]);

  return (
    <Container>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32, gap: 12 }}
      >
        {/* Imagen */}
        {imageUrl && (
          <View
            style={{
              width: '100%',
              aspectRatio: 3 / 2,
              backgroundColor: '#f2f2f2',
              borderRadius: 10,
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"  // 🔧 was "container"
            />
          </View>
        )}

        {/* Header de texto */}
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 4 }}>
            {venue.venueName || 'Sin nombre'}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {!!venue.venueCategory && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: '#f0f0f0',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600' }}>{venue.venueCategory}</Text>
              </View>
            )}
            {!!venue.venueLocation && (
              <Text style={{ fontSize: 13, opacity: 0.8 }}>· {venue.venueLocation}</Text>
            )}
          </View>
        </View>

        {/* Datos básicos */}
        <View style={{ gap: 4 }}>
          {!!venue.venueAddress && (
            <Text style={{ fontSize: 14 }}>
              📍 <Text style={{ fontWeight: '500' }}>{venue.venueAddress}</Text>
            </Text>
          )}
          {!!venue.venueContact && (
            <Text style={{ fontSize: 14 }}>
              📞 <Text style={{ fontWeight: '500' }}>{venue.venueContact}</Text>
            </Text>
          )}
        </View>

        {/* Descripción */}
        {!!venue.venueDescription && (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: '#fafafa',
              borderWidth: 1,
              borderColor: '#eee',
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 14, lineHeight: 20 }}>
              {venue.venueDescription}
            </Text>
          </View>
        )}

        {/* Horarios (si hay) */}
        {normalizedSchedules.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Horarios</Text>
            {WEEKDAYS_ORDER.map((day) => {
              const daySegments = normalizedSchedules.filter((s) => s.weekDay === day);
              if (!daySegments.length) return null;
              return (
                <View
                  key={day}
                  style={{
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f0f0f0',
                  }}
                >
                  <Text style={{ fontWeight: '600', marginBottom: 2 }}>{day}</Text>
                  <Text style={{ fontSize: 13, opacity: 0.8 }}>
                    {daySegments
                      .map(
                        (s) =>
                          `${s.openingTime_ ?? '--:--'} – ${s.closingTime_ ?? '--:--'}`
                      )
                      .join('  ·  ')}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Botón editar */}
        <Pressable
          onPress={() => router.push(`/(tabs)/perfil/negocios/${venueID}/editar`)}
          style={{
            marginTop: 16,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: '#111',
            borderRadius: 999,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>
            Editar
          </Text>
        </Pressable>
      </ScrollView>
    </Container>
  );
}
