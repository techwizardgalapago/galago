// src/app/(tabs)/perfil/negocios/[venueID]/index.js
import React, { useMemo } from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthBackground from '../../../../../components/auth/AuthBackground';
import AuthCard from '../../../../../components/auth/AuthCard';
import { selectVenueByIdFromState } from '../../../../../store/slices/venueSlice';

const WEEKDAYS_ORDER = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

export default function VenueDetailScreen() {
  const { venueID } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const venue = useSelector((s) => selectVenueByIdFromState(s, venueID));
  const topGap = 108;
  const topInset = Platform.OS === 'ios' ? insets.top : 0;
  console.log('VenueDetailScreen - venue from state:', venue);

  if (!venue) {
    return (
      <AuthBackground>
        <View style={styles.missingWrapper}>
          <Text style={styles.missingText}>No se encontró el negocio.</Text>
        </View>
      </AuthBackground>
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

  const imageUrl = firstImage?.thumbnails?.large?.url || firstImage?.url || null;

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

  const schedulesByDay = useMemo(() => {
    const map = {};
    normalizedSchedules.forEach((item) => {
      if (!item?.weekDay) return;
      if (!map[item.weekDay]) map[item.weekDay] = [];
      map[item.weekDay].push(item);
    });
    return map;
  }, [normalizedSchedules]);

  const ratingValue = venue?.venueRating ?? venue?.rating;
  const priceValue = venue?.venuePriceRange ?? venue?.priceRange;
  const ecoFriendly = venue?.ecoFriendly ?? venue?.isEcoFriendly;
  const acceptsCard = venue?.acceptsCard ?? venue?.acceptsCardPayments ?? venue?.cardAccepted;

  const normalizedRating =
    ratingValue !== null && ratingValue !== undefined
      ? String(typeof ratingValue === 'number' ? ratingValue.toFixed(1) : ratingValue)
      : null;

  const normalizedPrice =
    typeof priceValue === 'number'
      ? '$'.repeat(Math.max(1, Math.min(4, Math.round(priceValue))))
      : typeof priceValue === 'string' && priceValue.trim()
      ? priceValue.trim()
      : null;

  const tags = [
    ecoFriendly
      ? {
          key: 'eco',
          label: typeof ecoFriendly === 'string' ? ecoFriendly : 'Eco-Friendly',
          variant: 'green',
        }
      : null,
    acceptsCard
      ? {
          key: 'card',
          label: typeof acceptsCard === 'string' ? acceptsCard : 'acepta tarjeta',
          variant: 'orange',
        }
      : null,
    normalizedPrice
      ? { key: 'price', label: normalizedPrice, variant: 'price' }
      : null,
    normalizedRating
      ? { key: 'rating', label: normalizedRating, variant: 'rating' }
      : null,
  ].filter(Boolean);

  return (
    <AuthBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topGap + topInset },
        ]}
      >
        <AuthCard style={styles.card}>
          <View style={styles.section}>
            <View style={styles.heroWrap}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={styles.heroPlaceholder}>
                  <Text style={styles.heroPlaceholderText}>Sin imagen</Text>
                </View>
              )}
              <Pressable style={styles.heroArrow} onPress={() => {}}>
                <Ionicons name="chevron-forward" size={20} color="#FDFDFC" />
              </Pressable>
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.title}>{venue.venueName || 'Sin nombre'}</Text>
              {!!venue.venueCategory && (
                <Text style={styles.subtitle}>{venue.venueCategory}</Text>
              )}
            </View>

            {!!tags.length && (
              <View style={styles.tagRow}>
                {tags.map((tag) => {
                  if (tag.variant === 'price' && tag.label.includes('$')) {
                    const prefix = tag.label.slice(0, 2);
                    const suffix = tag.label.slice(2);
                    return (
                      <View key={tag.key} style={[styles.tag, styles.tagOrange]}>
                        <Text style={styles.tagText}>
                          <Text style={styles.tagText}>{prefix}</Text>
                          {!!suffix && <Text style={styles.tagTextMuted}>{suffix}</Text>}
                        </Text>
                      </View>
                    );
                  }

                  if (tag.variant === 'rating') {
                    return (
                      <View key={tag.key} style={[styles.tag, styles.tagOrange]}>
                        <Ionicons name="star" size={12} color="#E65300" />
                        <Text style={styles.tagText}>{tag.label}</Text>
                      </View>
                    );
                  }

                  return (
                    <View
                      key={tag.key}
                      style={[
                        styles.tag,
                        tag.variant === 'green' ? styles.tagGreen : styles.tagOrange,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          tag.variant === 'green' && styles.tagTextLight,
                        ]}
                      >
                        {tag.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {!!venue.venueDescription && (
              <Text style={styles.description}>{venue.venueDescription}</Text>
            )}

            <View style={styles.table}>
              {WEEKDAYS_ORDER.map((day, index) => {
                const daySegments = schedulesByDay[day] || [];
                const value = daySegments.length
                  ? daySegments
                      .map(
                        (s) =>
                          `${s.openingTime_ ?? '--:--'} - ${s.closingTime_ ?? '--:--'}`
                      )
                      .join('  ')
                  : 'cerrado';
                return (
                  <View
                    key={day}
                    style={[
                      styles.tableRow,
                      index % 2 === 1 && styles.tableRowAlt,
                    ]}
                  >
                    <View style={styles.tableDay}>
                      <Text style={styles.tableDayText}>{day.toLowerCase()}</Text>
                    </View>
                    <View style={styles.tableValue}>
                      <Text style={styles.tableValueText}>{value}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.actionRow}>
              <Pressable style={[styles.actionButton, styles.actionNeutral]} onPress={router.back}>
                <Ionicons name="arrow-back" size={18} color="#1B2222" />
              </Pressable>
              <Pressable style={[styles.actionButton, styles.actionYellow]} onPress={() => {}}>
                <Ionicons name="star" size={18} color="#FDFDFC" />
              </Pressable>
              <Pressable style={[styles.actionButton, styles.actionBlue]} onPress={() => {}}>
                <Ionicons name="map" size={18} color="#FDFDFC" />
              </Pressable>
              <Pressable style={[styles.actionButton, styles.actionGreen]} onPress={() => {}}>
                <Ionicons name="logo-whatsapp" size={18} color="#FDFDFC" />
              </Pressable>
              <Pressable style={[styles.actionButton, styles.actionOrange]} onPress={() => {}}>
                <Ionicons name="bookmark" size={18} color="#FDFDFC" />
              </Pressable>
            </View>
          </View>
        </AuthCard>
      </ScrollView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 20,
    paddingBottom: 30,
  },
  section: {
    gap: 18,
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  missingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  missingText: {
    opacity: 0.7,
  },
  heroWrap: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 333 / 272,
  },
  heroPlaceholder: {
    width: '100%',
    aspectRatio: 333 / 272,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E8E8',
  },
  heroPlaceholderText: {
    color: '#8F8F90',
    fontSize: 14,
  },
  heroArrow: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B2222',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8F8F90',
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tag: {
    borderRadius: 15,
    paddingHorizontal: 12,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  tagGreen: {
    backgroundColor: 'rgba(135,170,24,0.7)',
  },
  tagOrange: {
    backgroundColor: 'rgba(230,83,0,0.1)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E65300',
  },
  tagTextLight: {
    color: '#FDFDFC',
  },
  tagTextMuted: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(230,83,0,0.5)',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1B2222',
  },
  table: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D5D6D6',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowAlt: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tableDay: {
    width: 93,
    borderRightWidth: 1,
    borderColor: '#D5D6D6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tableValue: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tableDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B2222',
  },
  tableValueText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#1B2222',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionNeutral: {
    backgroundColor: '#EFEFEF',
  },
  actionYellow: {
    backgroundColor: '#F2B640',
  },
  actionBlue: {
    backgroundColor: '#0D71B9',
  },
  actionGreen: {
    backgroundColor: '#25D366',
  },
  actionOrange: {
    backgroundColor: '#F08A2B',
  },
});
