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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSelector, useDispatch } from 'react-redux';
import { router } from 'expo-router';

import Container from '../../../../../components/Container';
import Input from '../../../../../components/Input';
import Select from '../../../../../components/Select';

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
const inputStyle = {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: Platform.select({ ios: 12, android: 10, default: 8 }),
  backgroundColor: '#fff',
};
const chipRow = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 };
const chip = {
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: '#ddd',
  backgroundColor: '#fff',
};
const chipActive = { backgroundColor: '#eee', borderColor: '#999' };
const buttonStyle = { backgroundColor: '#0a6', paddingVertical: 14, borderRadius: 12 };

// ---------- Componentes auxiliares ----------
const TimeSelect = ({ value, onChange }) => (
  <Select
    value={value}
    onChange={onChange}
    options={ALLOWED_TIMES}
    placeholder={null}
    style={{ flex: 1 }}
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
    <Container>
      <ScrollView
        contentContainerStyle={{
          gap: 14,
          paddingBottom: 32,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700' }}>
          Registra tu negocio
        </Text>

        {/* Nombre */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Nombre</Text>
          <Input
            value={form.venueName}
            onChangeText={(t) => setForm((f) => ({ ...f, venueName: t }))}
            placeholder="Mi Café Galápagos"
          />
        </View>

        {/* Categoría (chips) */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Categoría</Text>
          <View style={chipRow}>
            {VENUE_CATEGORIES.map((c) => {
              const active = form.venueCategory === c;
              return (
                <Pressable
                  key={c}
                  onPress={() =>
                    setForm((f) => ({ ...f, venueCategory: c }))
                  }
                  style={[chip, active && chipActive]}
                >
                  <Text style={{ fontWeight: '600' }}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Ubicación (isla) */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Ubicación</Text>
          <Select
            value={form.venueLocation}
            onChange={(val) =>
              setForm((f) => ({ ...f, venueLocation: val }))
            }
            options={VENUE_LOCATIONS}
            placeholder="Selecciona una ubicación"
          />
        </View>

        {/* Dirección */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Dirección</Text>
          <Input
            value={form.venueAddress}
            onChangeText={(t) =>
              setForm((f) => ({ ...f, venueAddress: t }))
            }
            placeholder="Av. Charles Darwin"
          />
        </View>

        {/* Teléfono */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Teléfono de contacto</Text>
          <Input
            value={form.venueContact}
            onChangeText={(t) =>
              setForm((f) => ({ ...f, venueContact: t }))
            }
            placeholder="+593 99 123 4567"
            keyboardType="phone-pad"
          />
        </View>

        {/* Ubicación vía link de Google Maps */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Ubicación (link de Google Maps)</Text>
          <Input
            value={mapsUrl}
            onChangeText={setMapsUrl}
            placeholder="Pega aquí el link de Google Maps del negocio"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={{ fontSize: 11, color: '#777', marginTop: 4 }}>
            Tip: copia el link desde Google Maps en el navegador. Evita los links cortos de la app
            (maps.app.goo.gl).
          </Text>
          {isShortMapsLink(mapsUrl) && (
            <Text style={{ fontSize: 12, color: 'red', marginTop: 4 }}>
              Parece que este link es de la app (maps.app.goo.gl). Abre Google Maps en el navegador,
              copia el enlace completo y pégalo aquí.
            </Text>
          )}
        </View>

        {/* Descripción */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Descripción</Text>
          <Text
            style={{
              fontSize: 12,
              opacity: 0.7,
              marginBottom: 4,
            }}
          >
            Cuenta brevemente qué hace tu negocio y qué lo hace especial.
          </Text>
          <TextInput
            value={form.venueDescription}
            onChangeText={(t) =>
              setForm((f) => ({ ...f, venueDescription: t }))
            }
            placeholder="Describe tu negocio..."
            multiline
            style={[inputStyle, { minHeight: 90, textAlignVertical: 'top' }]}
          />
        </View>

        {/* ¿Es negocio? */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontWeight: '600' }}>¿Es negocio?</Text>
          <Switch
            value={form.negocio}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, negocio: v }))
            }
          />
        </View>

        {/* Horarios multi-segmento */}
        <View style={{ gap: 6, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={copyMondayToAll}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: '#eee',
                borderRadius: 8,
              }}
            >
              <Text>Copiar lunes a todos</Text>
            </Pressable>
          </View>

          {schedules.map((day, dayIdx) => (
            <View
              key={day.weekDay}
              style={{
                borderWidth: 1,
                borderColor: '#eee',
                borderRadius: 10,
                padding: 10,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '600' }}>{day.weekDay}</Text>
                <Switch
                  value={day.enabled}
                  onValueChange={(v) => setDayEnabled(dayIdx, v)}
                />
              </View>

              {day.enabled && (
                <>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 8,
                      marginTop: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Pressable
                      onPress={() => quickFillDay(dayIdx)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: '#eee',
                        borderRadius: 8,
                      }}
                    >
                      <Text>Rellenar 08:00–22:00</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => markDayClosed(dayIdx)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: '#eee',
                        borderRadius: 8,
                      }}
                    >
                      <Text>Marcar cerrado</Text>
                    </Pressable>
                  </View>

                  {day.segments.map((seg, segIdx) => (
                    <View
                      key={segIdx}
                      style={{
                        flexDirection: 'row',
                        gap: 10,
                        marginTop: 8,
                        alignItems: 'center',
                      }}
                    >
                      <TimeSelect
                        value={seg.openingTime_}
                        onChange={(val) =>
                          setSegmentValue(dayIdx, segIdx, { openingTime_: val })
                        }
                      />
                      <TimeSelect
                        value={seg.closingTime_}
                        onChange={(val) =>
                          setSegmentValue(dayIdx, segIdx, { closingTime_: val })
                        }
                      />
                      <Pressable
                        onPress={() => removeSegment(dayIdx, segIdx)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          backgroundColor: '#eee',
                          borderRadius: 8,
                        }}
                      >
                        <Text>Eliminar</Text>
                      </Pressable>
                    </View>
                  ))}

                  <Pressable
                    onPress={() => addSegment(dayIdx)}
                    style={{
                      marginTop: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      backgroundColor: '#eee',
                      borderRadius: 8,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text>+ Añadir franja</Text>
                  </Pressable>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Logo opcional */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '700' }}>Logo</Text>
          <Text
            style={{
              fontSize: 12,
              opacity: 0.7,
            }}
          >
            Sube el logo de tu negocio en formato JPG o PNG, máximo 2&nbsp;MB.
            Asegúrate de que tu imagen sea horizontal o cuadrada para evitar recortes incómodos.
          </Text>

          {image ? (
            <View style={{ gap: 8 }}>
              <Image
                source={{ uri: image.uri }}
                style={{ width: 120, height: 120, borderRadius: 16 }}
                resizeMode="contain"
              />
              <Pressable
                onPress={() => setImage(null)}
                style={{
                  padding: 10,
                  backgroundColor: '#eee',
                  borderRadius: 10,
                }}
              >
                <Text>Quitar logo</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={pickImage}
              style={{
                padding: 12,
                backgroundColor: '#111',
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: 'white',
                  textAlign: 'center',
                  fontWeight: '700',
                }}
              >
                Seleccionar logo
              </Text>
            </Pressable>
          )}
        </View>

        {!!error && <Text style={{ color: '#c00' }}>{error}</Text>}

        <Pressable
          onPress={onSave}
          disabled={saving}
          style={[buttonStyle, saving && { opacity: 0.6 }]}
        >
          <Text
            style={{
              color: 'white',
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Text>
        </Pressable>
      </ScrollView>
    </Container>
  );
}
