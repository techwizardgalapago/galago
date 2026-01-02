// src/app/(tabs)/perfil/negocios/crear/index.js
import React, { useMemo, useState } from 'react';
import {
  Platform,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
  Image,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSelector, useDispatch } from 'react-redux';
import { router } from 'expo-router';

import AuthBackground from '../../../../../components/auth/AuthBackground';
import AuthCard from '../../../../../components/auth/AuthCard';
import AuthButton from '../../../../../components/auth/AuthButton';
import AuthInput from '../../../../../components/auth/AuthInput';
import Select from '../../../../../components/Select';
import { useMedia } from '../../../../../hooks/useMedia';

import {
  createVenue,
  createVenueSchedules,
  uploadVenueImage,
  parseCreatedVenueId,
  getVenueById,
} from '../../../../../services/venuesService';

import { upsertVenuesFromAPIThunk } from '../../../../../store/slices/venueSlice';

// ---------- Constantes ----------
const VENUE_CATEGORIES = [
  'Restaurante',
  'Café',
  'Club',
  'Bar',
  'Teatro',
  'Spa',
  'Museo',
  'Centro Turístico',
  'Casa Cultural',
  'Parque',
  'Tienda',
  'Souvenirs',
  'Otro',
];

const VENUE_LOCATIONS = ['Isla San Cristobal', 'Isla Isabela', 'Isla Santa Cruz'];

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const ALLOWED_TIMES = [
  '00:00','00:30','01:00','01:30','02:00','02:30','03:00','03:30',
  '04:00','04:30','05:00','05:30','06:00','06:30','07:00','07:30',
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30',
  '20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30',
];

// ---------- Estilos base ----------
const buttonStyle = { backgroundColor: '#0a6', paddingVertical: 14, borderRadius: 12 };
const selectFullStyle = { maxWidth: '100%', height: 40 };

// ---------- Componentes auxiliares ----------
const TimeSelect = ({ value, onChange }) => (
  <Select
    value={value}
    onChange={onChange}
    options={ALLOWED_TIMES}
    placeholder={null}
    style={{ flex: 1, maxWidth: 96 }}
  />
);

const buildDefaultSchedules = () =>
  WEEKDAYS.map((d) => ({
    weekDay: d,
    enabled: false,
    segments: [{ openingTime_: '08:00', closingTime_: '22:00' }],
  }));

const validateDaySegments = (segments = []) => {
  const toMinutes = (hhmm) => {
    const [h, m] = (hhmm || '').split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const list = segments
    .map((s) => ({
      from: toMinutes(s.openingTime_),
      to: toMinutes(s.closingTime_),
    }))
    .sort((a, b) => a.from - b.from);

  for (const seg of list) {
    if (!(seg.from < seg.to)) return 'Rango inválido (apertura debe ser menor al cierre).';
  }
  for (let i = 1; i < list.length; i++) {
    if (list[i].from < list[i - 1].to) return 'Rangos superpuestos en el mismo día.';
  }
  return '';
};

// ---------- Helpers para Google Maps (link → lat/lng) ----------
const extractLatLngFromGoogleMapsUrl = (url) => {
  try {
    if (!url) return null;
    const cleanUrl = url.trim();

    // Caso 1: patrón @lat,lng
    // Ej: https://www.google.com/maps/place/.../@-2.1709979,-79.9223592,17z
    const atPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const atMatch = cleanUrl.match(atPattern);
    if (atMatch) {
      return {
        latitude: parseFloat(atMatch[1]),
        longitude: parseFloat(atMatch[2]),
      };
    }

    // Caso 2: query=lat,lng
    // Ej: https://www.google.com/maps/search/?api=1&query=-2.17099,-79.92235
    const queryPattern = /[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const queryMatch = cleanUrl.match(queryPattern);
    if (queryMatch) {
      return {
        latitude: parseFloat(queryMatch[1]),
        longitude: parseFloat(queryMatch[2]),
      };
    }

    return null;
  } catch (error) {
    console.error('Error extrayendo lat/lng desde URL:', error);
    return null;
  }
};

// Detectar links cortos tipo app
const isShortMapsLink = (url) =>
  !!url && (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps'));

// En native podrías intentar esto; en web no sirve por CORS, así que lo evitamos allá.
const resolveShortMapsUrl = async (shortUrl) => {
  try {
    if (!shortUrl) return null;

    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    return response?.url || shortUrl;
  } catch (error) {
    console.error('Error resolviendo link corto de Maps:', error);
    return null;
  }
};

const getCoordsFromGoogleMapsLink = async (url) => {
  if (!url) return null;

  const short = isShortMapsLink(url);
  let finalUrl = url;

  if (short) {
    // En web NO podemos seguir redirecciones de maps.app.goo.gl por CORS
    if (Platform.OS === 'web') {
      console.warn(
        'Links cortos de Google Maps no se pueden resolver en Web por CORS. Usa el link largo desde el navegador.'
      );
      return null;
    }

    // En iOS/Android sí intentamos resolver
    const resolved = await resolveShortMapsUrl(url);
    if (resolved) {
      finalUrl = resolved;
    }
  }

  return extractLatLngFromGoogleMapsUrl(finalUrl);
};

// ---------- Componente principal ----------
export default function CrearNegocioScreen() {
  const dispatch = useDispatch();
  const authUser = useSelector((s) => s.auth?.user);
  const { isDesktop, isWide } = useMedia();
  const isDesktopLayout = isDesktop || isWide;
  const [containerHeight, setContainerHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const topGap = 108;
  const cardHeight = Math.max((containerHeight || windowHeight) - topGap, 0);

  const [form, setForm] = useState({
    venueName: '',
    venueCategory: VENUE_CATEGORIES[0],
    venueLocation: VENUE_LOCATIONS[0],
    venueAddress: '',
    venueDescription: '',
    latitude: '',   // se llenará al guardar si hay link válido
    longitude: '',
    negocio: true,
    venueContact: '',
  });

  const [schedules, setSchedules] = useState(buildDefaultSchedules());
  const [image, setImage] = useState(null); // { uri, name, type }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Link de Google Maps
  const [mapsUrl, setMapsUrl] = useState('');

  const anyDayEnabled = useMemo(
    () => schedules.some((d) => d.enabled),
    [schedules]
  );

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker?.MediaType?.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      const name = asset.fileName || `venue_${Date.now()}.jpg`;
      const type = asset.mimeType || 'image/jpeg';
      setImage({ uri: asset.uri, name, type });
    }
  };

  // ---------- Helpers de horarios ----------
  const quickFillDay = (dayIdx, open = '08:00', close = '22:00') => {
    setSchedules((prev) => {
      const copy = [...prev];
      copy[dayIdx] = {
        ...copy[dayIdx],
        enabled: true,
        segments: [{ openingTime_: open, closingTime_: close }],
      };
      return copy;
    });
  };

  const copyMondayToAll = () => {
    const monday = schedules[0];
    if (!monday?.enabled) return;
    setSchedules((prev) =>
      prev.map((d, i) =>
        i === 0
          ? d
          : {
              ...d,
              enabled: true,
              segments: monday.segments.map((s) => ({
                openingTime_: s.openingTime_,
                closingTime_: s.closingTime_,
              })),
            }
      )
    );
  };

  const markDayClosed = (dayIdx) => {
    setSchedules((prev) => {
      const copy = [...prev];
      copy[dayIdx] = {
        ...copy[dayIdx],
        enabled: false,
        segments: [{ openingTime_: '08:00', closingTime_: '22:00' }],
      };
      return copy;
    });
  };

  const setDayEnabled = (dayIdx, v) => {
    setSchedules((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIdx] };
      day.enabled = v;
      if (v && (!day.segments || day.segments.length === 0)) {
        day.segments = [{ openingTime_: '08:00', closingTime_: '22:00' }];
      }
      copy[dayIdx] = day;
      return copy;
    });
  };

  const setSegmentValue = (dayIdx, segIdx, patch) => {
    setSchedules((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIdx] };
      const segs = [...day.segments];
      segs[segIdx] = { ...segs[segIdx], ...patch };
      day.segments = segs;
      copy[dayIdx] = day;
      return copy;
    });
  };

  const addSegment = (dayIdx) => {
    setSchedules((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIdx] };
      day.segments = [
        ...day.segments,
        { openingTime_: '15:00', closingTime_: '20:00' },
      ];
      copy[dayIdx] = day;
      return copy;
    });
  };

  const removeSegment = (dayIdx, segIdx) => {
    setSchedules((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIdx] };
      const segs = day.segments.filter((_, i) => i !== segIdx);
      day.segments = segs.length
        ? segs
        : [{ openingTime_: '08:00', closingTime_: '22:00' }];
      copy[dayIdx] = day;
      return copy;
    });
  };

  // ---------- Validaciones ----------
  const validate = () => {
    const errs = [];
    if (!form.venueName?.trim()) errs.push('Nombre del negocio es requerido');
    if (!form.venueCategory?.trim()) errs.push('Categoría requerida');
    if (!form.venueLocation?.trim()) errs.push('Ubicación requerida');
    if (!form.venueDescription?.trim()) errs.push('Descripción requerida');

    for (const day of schedules) {
      if (!day.enabled) continue;
      const msg = validateDaySegments(day.segments);
      if (msg) {
        errs.push(`(${day.weekDay}) ${msg}`);
        break;
      }
    }

    setError(errs[0] || '');
    return errs.length === 0;
  };

  const isAllowed = (t) => ALLOWED_TIMES.includes(t);

  // ---------- Guardar ----------
  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      let latitudeStr = form.latitude;
      let longitudeStr = form.longitude;

      // 1) Resolver coords desde el link de Google Maps si:
      // - hay link Y
      // - no se llenaron coords manualmente
      if (mapsUrl && (!latitudeStr || !longitudeStr)) {
        const coords = await getCoordsFromGoogleMapsLink(mapsUrl);
        if (!coords) {
          setError(
            Platform.OS === 'web'
              ? 'No pude leer la ubicación del link. Usa el enlace completo desde Google Maps en el navegador (no el link corto de la app).'
              : 'No pude leer la ubicación del link de Google Maps. Revisa el enlace.'
          );
          setSaving(false);
          return;
        }
        latitudeStr = String(coords.latitude);
        longitudeStr = String(coords.longitude);
      }

      // 2) Construir fields para crear venue
      const fields = {
        venueCategory: form.venueCategory,
        venueLocation: form.venueLocation,
        venueAddress: form.venueAddress || '',
        latitude: latitudeStr ? Number(latitudeStr) : undefined,
        longitude: longitudeStr ? Number(longitudeStr) : undefined,
        venueName: form.venueName,
        venueDescription: form.venueDescription,
        negocio: !!form.negocio,
        userID: [authUser?.userID] || null,
        venueContact: form.venueContact || '',
      };

      const venueResp = await createVenue(fields);
      const venueID =
        parseCreatedVenueId(venueResp) || venueResp?.venueID || venueResp?.id;
      if (!venueID) throw new Error('No se recibió el ID del venue creado');

      // 3) Crear horarios
      const payload = [];
      for (const day of schedules) {
        if (!day.enabled) continue;
        for (const seg of day.segments) {
          if (!isAllowed(seg.openingTime_) || !isAllowed(seg.closingTime_)) {
            setError(
              `Horario inválido para ${day.weekDay}. Usa tiempos como 08:00, 12:30, 22:00.`
            );
            setSaving(false);
            return;
          }
          payload.push({
            fields: {
              linkedVenue: [venueID],
              weekDay: day.weekDay,
              openingTime_: seg.openingTime_,
              closingTime_: seg.closingTime_,
            },
          });
        }
      }

      if (payload.length > 0) {
        await createVenueSchedules(payload);
      }

      // 4) Subir logo si existe
      if (image) {
        if (Platform.OS === 'web') {
          const res = await fetch(image.uri);
          const blob = await res.blob();
          const file = new File(
            [blob],
            image.name || 'venue.jpg',
            { type: blob.type || image.type || 'image/jpeg' }
          );
          const formData = new FormData();
          formData.append('image', file);
          await uploadVenueImage(venueID, formData);
        } else {
          await uploadVenueImage(venueID, image);
        }
      }

      // 5) Actualizar Redux con el venue completo
      const venueFull = await getVenueById(venueID);
      if (venueFull && upsertVenuesFromAPIThunk) {
        dispatch(upsertVenuesFromAPIThunk([venueFull]));
      }

      router.replace('/(tabs)/perfil');
    } catch (e) {
      console.error('Crear negocio falló:', e);
      setError('No se pudo registrar el negocio.');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Render ----------
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
            paddingTop: 20,
            paddingBottom: 24,
          }}
        >
          <ScrollView
            contentContainerStyle={{
              gap: 25,
              paddingHorizontal: 30,
              paddingBottom: 32,
            }}
          >
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderBottomLeftRadius: 10,
                borderBottomRightRadius: 10,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: '600',
                  color: '#1B2222',
                  textAlign: 'center',
                  marginBottom: 4,
                }}
              >
                Registra tu negocio
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: '#1B2222',
                  textAlign: 'center',
                  opacity: 0.9,
                }}
              >
                (para más información contactese con nuestro equipo)
              </Text>
            </View>
            {isDesktopLayout ? (
              <View style={{ flexDirection: 'row', gap: 24 }}>
              <View style={{ flex: 1, gap: 25 }}>
                <Text style={{ fontSize: 14, color: '#1B2222' }}>
                  Nombre del establecimiento:
                </Text>
                <AuthInput
                  value={form.venueName}
                  onChangeText={(t) => setForm((f) => ({ ...f, venueName: t }))}
                  placeholder="Nombre del establecimiento"
                />
                <Text style={{ fontSize: 14, color: '#1B2222' }}>Dirección:</Text>
                <AuthInput
                  value={form.venueAddress}
                  onChangeText={(t) =>
                    setForm((f) => ({ ...f, venueAddress: t }))
                  }
                    placeholder="Dirección"
                  />
                  <Text style={{ fontSize: 14, color: '#1B2222' }}>
                    Información de contacto:
                  </Text>
                  <AuthInput
                    value={form.venueContact}
                    onChangeText={(t) =>
                      setForm((f) => ({ ...f, venueContact: t }))
                    }
                    placeholder="Número de contacto"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={{ flex: 1, gap: 25 }}>
                  <Text style={{ fontSize: 14, color: '#1B2222' }}>Ubicación:</Text>
                  <Select
                    value={form.venueLocation}
                    onChange={(val) =>
                      setForm((f) => ({ ...f, venueLocation: val }))
                    }
                    options={VENUE_LOCATIONS}
                    placeholder="Seleccionar"
                    style={selectFullStyle}
                  />
                  <Text style={{ fontSize: 14, color: '#1B2222' }}>Categoria:</Text>
                  <Select
                    value={form.venueCategory}
                    onChange={(val) =>
                      setForm((f) => ({ ...f, venueCategory: val }))
                    }
                    options={VENUE_CATEGORIES}
                    placeholder="Seleccionar"
                    style={selectFullStyle}
                  />
                  <Text style={{ fontSize: 14, color: '#1B2222' }}>
                    Ubicación (link de Google Maps):
                  </Text>
                  <AuthInput
                    value={mapsUrl}
                    onChangeText={setMapsUrl}
                    placeholder="Pega el link de Google Maps"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: '#1B2222', flex: 1 }}>
                      Imágenes:
                    </Text>
                    <Pressable
                      onPress={pickImage}
                      style={{
                        backgroundColor: '#EDEDED',
                        height: 34,
                        borderRadius: 50,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 16,
                      }}
                    >
                      <Text style={{ color: '#000', fontSize: 14 }}>
                        Seleccionar
                      </Text>
                    </Pressable>
                  </View>
                  {image ? (
                    <Image
                      source={{ uri: image.uri }}
                      style={{ width: 100, height: 100, borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 14, color: '#1B2222' }}>
                  Nombre del establecimiento:
                </Text>
                <AuthInput
                  value={form.venueName}
                  onChangeText={(t) => setForm((f) => ({ ...f, venueName: t }))}
                  placeholder="Nombre del establecimiento"
                />
                <Text style={{ fontSize: 14, color: '#1B2222' }}>Dirección:</Text>
                <AuthInput
                  value={form.venueAddress}
                  onChangeText={(t) =>
                    setForm((f) => ({ ...f, venueAddress: t }))
                  }
                  placeholder="Dirección"
                />
                <Text style={{ fontSize: 14, color: '#1B2222' }}>
                  Información de contacto:
                </Text>
                <AuthInput
                  value={form.venueContact}
                  onChangeText={(t) =>
                    setForm((f) => ({ ...f, venueContact: t }))
                  }
                  placeholder="Número de contacto"
                  keyboardType="phone-pad"
                />
                <Text style={{ fontSize: 14, color: '#1B2222' }}>Ubicación:</Text>
                <Select
                  value={form.venueLocation}
                  onChange={(val) =>
                    setForm((f) => ({ ...f, venueLocation: val }))
                  }
                  options={VENUE_LOCATIONS}
                  placeholder="Seleccionar"
                  style={selectFullStyle}
                />
                <Text style={{ fontSize: 14, color: '#1B2222' }}>Categoria:</Text>
                <Select
                  value={form.venueCategory}
                  onChange={(val) =>
                    setForm((f) => ({ ...f, venueCategory: val }))
                  }
                  options={VENUE_CATEGORIES}
                  placeholder="Seleccionar"
                  style={selectFullStyle}
                />
                <Text style={{ fontSize: 14, color: '#1B2222' }}>
                  Ubicación (link de Google Maps):
                </Text>
                <AuthInput
                  value={mapsUrl}
                  onChangeText={setMapsUrl}
                  placeholder="Pega el link de Google Maps"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#1B2222', flex: 1 }}>
                    Imágenes:
                  </Text>
                  <Pressable
                    onPress={pickImage}
                    style={{
                      backgroundColor: '#EDEDED',
                      height: 34,
                      borderRadius: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text style={{ color: '#99A0A0', fontSize: 14 }}>
                      Seleccionar
                    </Text>
                  </Pressable>
                </View>
                {image ? (
                  <Image
                    source={{ uri: image.uri }}
                    style={{ width: 100, height: 100, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                ) : null}
              </>
            )}

            <Text style={{ fontSize: 14, color: '#1B2222' }}>
              Horarios de apertura:
            </Text>
            <Pressable
              onPress={copyMondayToAll}
              style={{
                backgroundColor: '#EDEDED',
                borderRadius: 10,
                paddingHorizontal: 12,
                height: 30,
                alignSelf: 'flex-start',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 12, color: '#1B2222' }}>
                Copiar lunes a todos
              </Text>
            </Pressable>

            {schedules.map((day, dayIdx) => (
              <View key={day.weekDay} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#1B2222', flex: 1 }}>
                    {day.weekDay}:
                  </Text>
                  <Switch
                    value={day.enabled}
                    onValueChange={(v) => setDayEnabled(dayIdx, v)}
                  />
                </View>
                {day.enabled ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => quickFillDay(dayIdx)}
                        style={{
                          backgroundColor: '#EDEDED',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          height: 30,
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#1B2222' }}>
                          Rellenar 08:00–22:00
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => markDayClosed(dayIdx)}
                        style={{
                          backgroundColor: '#EDEDED',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          height: 30,
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#1B2222' }}>
                          Marcar cerrado
                        </Text>
                      </Pressable>
                    </View>
                    {day.segments.map((seg, segIdx) => (
                      <View
                        key={segIdx}
                        style={{ flexDirection: 'row', gap: 10 }}
                      >
                        <TimeSelect
                          value={seg.openingTime_}
                          onChange={(val) =>
                            setSegmentValue(dayIdx, segIdx, {
                              openingTime_: val,
                            })
                          }
                        />
                        <TimeSelect
                          value={seg.closingTime_}
                          onChange={(val) =>
                            setSegmentValue(dayIdx, segIdx, {
                              closingTime_: val,
                            })
                          }
                        />
                        {day.segments.length > 1 ? (
                          <Pressable
                            onPress={() => removeSegment(dayIdx, segIdx)}
                            style={{
                              backgroundColor: '#EDEDED',
                              borderRadius: 10,
                              paddingHorizontal: 10,
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 12, color: '#1B2222' }}>
                              Eliminar
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                    <Pressable
                      onPress={() => addSegment(dayIdx)}
                      style={{
                        backgroundColor: '#EDEDED',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        height: 30,
                        alignSelf: 'flex-start',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#1B2222' }}>
                        + Añadir franja
                      </Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ))}

            <Text style={{ fontSize: 14, color: '#1B2222' }}>
              Descripción del local:
            </Text>
            <TextInput
              value={form.venueDescription}
              onChangeText={(t) =>
                setForm((f) => ({ ...f, venueDescription: t }))
              }
              placeholder="Descripción"
              multiline
              style={{
                backgroundColor: '#EDEDED',
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 14,
                minHeight: 94,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 14, color: '#1B2222' }}>¿Es negocio?</Text>
              <Switch
                value={form.negocio}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, negocio: v }))
                }
              />
            </View>

        {!!error && <Text style={{ color: '#c00' }}>{error}</Text>}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <AuthButton
            label="Regresar"
            variant="outline"
            onPress={() => router.back()}
            style={{ flex: 1, backgroundColor: '#9B9B9B' }}
            textStyle={{ color: '#1B2222' }}
          />
          <AuthButton
            label={saving ? 'Guardando…' : 'Crear'}
            onPress={onSave}
            disabled={saving}
            style={{ flex: 1, backgroundColor: '#F49DB6' }}
            textStyle={{ color: '#1B2222' }}
          />
        </View>
      </ScrollView>
    </AuthCard>
  </View>
 </AuthBackground>
  );
}
