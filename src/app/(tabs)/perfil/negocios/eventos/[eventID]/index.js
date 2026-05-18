// src/app/(tabs)/perfil/negocios/eventos/[eventID]/index.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import AuthBackground from '../../../../../../components/auth/AuthBackground';
import AuthCard from '../../../../../../components/auth/AuthCard';
import { fetchEventsRemote } from '../../../../../../store/slices/eventsSlice';
import { getEventById } from '../../../../../../services/eventsService';

// ---------- Helpers ----------
const pad = (n) => String(n).padStart(2, '0');

const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${days[d.getDay()]} ${pad(d.getDate())} ${months[d.getMonth()]} — ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getEventImageUrl = (eventImage) => {
  if (!eventImage) return null;
  try {
    if (Array.isArray(eventImage)) {
      const first = eventImage[0];
      return first?.thumbnails?.large?.url || first?.url || null;
    }
    if (typeof eventImage === 'string' && eventImage.trim()) {
      if (eventImage.startsWith('http')) return eventImage;
      const parsed = JSON.parse(eventImage);
      if (Array.isArray(parsed)) {
        const first = parsed[0];
        return first?.thumbnails?.large?.url || first?.url || null;
      }
    }
  } catch (_) {}
  return null;
};

export default function EventoDetailScreen() {
  const { eventID } = useLocalSearchParams();
  const dispatch = useDispatch();

  const event = useSelector((s) =>
    (s.events?.list || []).find((e) => e.eventID === eventID)
  );

  const [remoteEvent, setRemoteEvent] = useState(null);

  useEffect(() => {
    if (!eventID) return;
    let active = true;
    const load = async () => {
      try {
        const res = await getEventById(eventID);
        const data = res?.fields ? { eventID: res.id ?? eventID, ...res.fields } : res;
        if (active && data) setRemoteEvent(data);
      } catch (e) {
        console.warn('EventoDetailScreen - getEventById failed:', e?.message);
      }
    };
    load();
    return () => { active = false; };
  }, [eventID]);

  useEffect(() => {
    if (!event) dispatch(fetchEventsRemote());
  }, [dispatch, event]);

  const ev = remoteEvent || event;

  const imageUrl = getEventImageUrl(ev?.eventImage);

  const tags = ev?.eventTags
    ? String(ev.eventTags)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const price =
    !ev?.eventPrice || Number(ev.eventPrice) === 0
      ? 'Gratis'
      : `$${Number(ev.eventPrice).toFixed(2)}`;

  const openWhatsApp = async () => {
    const rawPhone = `${ev?.telOrganizador ?? ''}`.trim();
    if (!rawPhone) return;
    const normalized = rawPhone.replace(/[^\d+]/g, '');
    const phone = normalized.startsWith('+') ? normalized.slice(1) : normalized;
    const message = encodeURIComponent(`Hola, te escribo por el evento ${ev?.eventName || ''}.`);
    const webUrl = `https://wa.me/${phone}?text=${message}`;
    const appUrl = `whatsapp://send?phone=${phone}&text=${message}`;
    if (Platform.OS === 'web') { window.open(webUrl, '_blank', 'noopener'); return; }
    const canOpen = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpen ? appUrl : webUrl);
  };

  if (!ev) {
    return (
      <AuthBackground>
        <View style={styles.missingWrapper}>
          <Text style={styles.missingText}>No se encontró el evento.</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Regresar</Text>
          </Pressable>
        </View>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 108 }]}>
        <AuthCard style={styles.card}>
          <Pressable onPress={() => router.push('/(tabs)/perfil/negocios')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={18} color="#1B2222" />
          </Pressable>

          <View style={styles.section}>
            {/* Hero image */}
            <View style={styles.heroWrap}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={styles.heroPlaceholder}>
                  <Text style={styles.heroPlaceholderText}>Sin imagen</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{ev.eventName || 'Sin nombre'}</Text>
              {!!ev.eventVenueName && (
                <Text style={styles.subtitle}>{ev.eventVenueName}</Text>
              )}
            </View>

            {/* Tags */}
            {tags.length > 0 && (
              <View style={styles.tagRow}>
                {tags.map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Info table */}
            <View style={styles.table}>
              <InfoRow label="Inicio" value={formatDateTime(ev.startTime)} alt={false} />
              <InfoRow label="Fin" value={formatDateTime(ev.endTime)} alt={true} />
              {!!ev.eventIslandLocation && (
                <InfoRow label="Isla" value={ev.eventIslandLocation} alt={false} />
              )}
              {!!ev.direccionVenues && (
                <InfoRow label="Dirección" value={ev.direccionVenues} alt={true} />
              )}
              <InfoRow label="Precio" value={price} alt={!ev.direccionVenues} />
              {!!ev.eventCapacity && (
                <InfoRow label="Capacidad" value={`${ev.eventCapacity} personas`} alt={true} />
              )}
              {!!ev.telOrganizador && (
                <InfoRow label="Contacto" value={ev.telOrganizador} alt={false} />
              )}
            </View>

            {/* Description */}
            {!!ev.eventDescription && (
              <Text style={styles.description}>{ev.eventDescription}</Text>
            )}

            {/* Action row */}
            <View style={styles.actionRow}>
              {!!ev.telOrganizador && (
                <Pressable style={[styles.actionButton, styles.actionGreen]} onPress={openWhatsApp}>
                  <Ionicons name="logo-whatsapp" size={18} color="#FDFDFC" />
                </Pressable>
              )}
            </View>

            {/* Edit button */}
            <Pressable
              onPress={() => router.push(`/(tabs)/perfil/negocios/eventos/${eventID}/editar`)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Editar</Text>
            </Pressable>
          </View>
        </AuthCard>
      </ScrollView>
    </AuthBackground>
  );
}

const InfoRow = ({ label, value, alt }) => (
  <View style={[styles.tableRow, alt && styles.tableRowAlt]}>
    <View style={styles.tableLabel}>
      <Text style={styles.tableLabelText}>{label}</Text>
    </View>
    <View style={styles.tableValue}>
      <Text style={styles.tableValueText}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 20,
    paddingBottom: 30,
    position: 'relative',
  },
  section: { gap: 18, paddingHorizontal: 30, paddingBottom: 30, paddingTop: 38 },
  missingWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  missingText: { opacity: 0.7, fontSize: 16 },
  backLink: { backgroundColor: '#EDEDED', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  backLinkText: { fontSize: 14, color: '#1B2222' },
  backButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  heroWrap: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  heroImage: { width: '100%', aspectRatio: 333 / 200 },
  heroPlaceholder: {
    width: '100%',
    aspectRatio: 333 / 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E8E8',
  },
  heroPlaceholderText: { color: '#8F8F90', fontSize: 14 },
  titleBlock: { alignItems: 'center', gap: 6 },
  title: { fontSize: 20, fontWeight: '700', color: '#1B2222', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8F8F90', textAlign: 'center' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  tag: {
    borderRadius: 15,
    paddingHorizontal: 12,
    height: 26,
    backgroundColor: 'rgba(242,103,25,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: { fontSize: 12, fontWeight: '500', color: '#F26719' },
  description: { fontSize: 14, lineHeight: 20, color: '#1B2222' },
  table: { borderRadius: 10, borderWidth: 1, borderColor: '#D5D6D6', overflow: 'hidden' },
  tableRow: { flexDirection: 'row' },
  tableRowAlt: { backgroundColor: 'rgba(0,0,0,0.05)' },
  tableLabel: {
    width: 90,
    borderRightWidth: 1,
    borderColor: '#D5D6D6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tableValue: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
  tableLabelText: { fontSize: 13, fontWeight: '600', color: '#1B2222' },
  tableValueText: { fontSize: 13, fontWeight: '300', color: '#1B2222' },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGreen: { backgroundColor: '#25D366' },
  editButton: {
    backgroundColor: '#F26719',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'center',
    minWidth: 127,
  },
  editButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500', textAlign: 'center' },
});
