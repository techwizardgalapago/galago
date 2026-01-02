// src/app/(tabs)/perfil/negocios/[venueID]/editar/index.js
import React, { useEffect, useRef, useState, useMemo } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';

import AuthBackground from '../../../../../../components/auth/AuthBackground';
import AuthCard from '../../../../../../components/auth/AuthCard';
import AuthButton from '../../../../../../components/auth/AuthButton';
import AuthInput from '../../../../../../components/auth/AuthInput';
import Select from '../../../../../../components/Select';
import { useMedia } from '../../../../../../hooks/useMedia';

import {
  selectVenueByIdFromState,
  upsertVenuesFromAPIThunk,
  editVenueLocal,
} from '../../../../../../store/slices/venueSlice';

import {
  patchVenue,
  uploadVenueImage,
  createVenueSchedules,
  updateVenueSchedules,
  deleteVenueScheduleById,
} from '../../../../../../services/venuesService';

import {
  ALLOWED_TIMES,
  groupVenueSchedules,
  flattenOriginal,
  buildDefaultSchedules,
  buildCreatePayload,
  buildUpdatePayload,
  buildDeleteIds,
  validateDaySegments,
} from '../../../../../../features/venues/schedules';

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

const inputStyle = {
  backgroundColor: '#EDEDED',
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 14,
};

// ⬇️ ahora TimeSelect usa el Select global (mismo estilo que tus selects)
const TimeSelect = ({ value, onChange }) => (
  <Select
    value={value}
    onChange={onChange}
    options={ALLOWED_TIMES}
    placeholder={null}
    style={{ flex: 1, maxWidth: 96 }}
  />
);

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

export default function EditVenueScreen() {
  const { venueID } = useLocalSearchParams();
  const dispatch = useDispatch();
  const venue = useSelector((s) => selectVenueByIdFromState(s, venueID));
  const authUser = useSelector((s) => s.auth?.user);
  const { isDesktop, isWide } = useMedia();
  const isDesktopLayout = isDesktop || isWide;

  const [form, setForm] = useState({
    venueName: '',
    venueCategory: VENUE_CATEGORIES[0],
    venueLocation: VENUE_LOCATIONS[0],
    venueAddress: '',
    venueDescription: '',
    venueContact: '',
    latitude: '',
    longitude: '',
    negocio: true,
  });

  const [schedules, setSchedules] = useState(buildDefaultSchedules());
  const originalFlatRef = useRef([]);

  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Link de Google Maps (para actualizar coords desde aquí si el usuario quiere)
  const [mapsUrl, setMapsUrl] = useState('');

  const anyDayEnabled = useMemo(
    () => schedules.some((d) => d.enabled),
    [schedules]
  );

  useEffect(() => {
    if (!venue) return;
    console.log('Editing venue:', venue);

    setForm({
      venueName: venue.venueName || '',
      venueCategory: venue.venueCategory || VENUE_CATEGORIES[0],
      venueLocation: venue.venueLocation || VENUE_LOCATIONS[0],
      venueAddress: venue.venueAddress || '',
      venueDescription: venue.venueDescription || '',
      venueContact: venue.venueContact || '',
      latitude: (venue.latitude ?? '')?.toString(),
      longitude: (venue.longitud ?? venue.longitude ?? '')?.toString(),
      negocio: !!venue.negocio,
    });

    if (Array.isArray(venue.VenueSchedules)) {
      console.log('VenueSchedules found:', venue.VenueSchedules);
      originalFlatRef.current = flattenOriginal(venue.VenueSchedules);
      console.log('Loaded originalFlatRef.current:', originalFlatRef.current);
      setSchedules(groupVenueSchedules(venue.VenueSchedules));
    } else {
      originalFlatRef.current = [];
      console.log('No VenueSchedules found, using default schedules.');
      setSchedules(buildDefaultSchedules());
    }

    // mapsUrl empieza vacío; el usuario pega uno nuevo si quiere actualizar coords
    setMapsUrl('');
  }, [venue]);

  // ---- horarios helpers ----
  const setDayEnabled = (dayIdx, v) => {
    setSchedules((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIdx] };
      day.enabled = v;
      if (v && (!day.segments || day.segments.length === 0)) {
        day.segments = [
          { id: undefined, openingTime_: '08:00', closingTime_: '22:00' },
        ];
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

  const removeSegment = (dayIdx, segIdx) => {
    setSchedules((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIdx] };
      const segs = day.segments.filter((_, i) => i !== segIdx);
      day.segments = segs.length
        ? segs
        : [{ id: undefined, openingTime_: '08:00', closingTime_: '22:00' }];
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
        { id: undefined, openingTime_: '15:00', closingTime_: '20:00' },
      ];
      copy[dayIdx] = day;
      return copy;
    });
  };

  const quickFillDay = (dayIdx, open = '08:00', close = '22:00') => {
    setSchedules((prev) => {
      const copy = [...prev];
      copy[dayIdx] = {
        ...copy[dayIdx],
        enabled: true,
        segments: [{ id: undefined, openingTime_: open, closingTime_: close }],
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
                id: undefined,
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
        segments: [
          { id: undefined, openingTime_: '08:00', closingTime_: '22:00' },
        ],
      };
      return copy;
    });
  };

  // ------------- validate form -------------
  const validate = () => {
    const errs = [];
    if (!form.venueName?.trim()) errs.push('Nombre requerido');

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

  // ------------- SAVE -------------
  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // coords base: las que están en el form
      let latitudeStr = form.latitude;
      let longitudeStr = form.longitude;

      // Si el usuario pegó un link de Maps, intentamos usarlas primero
      if (mapsUrl) {
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

      if (Platform.OS === 'web') {
        const originalFlat = originalFlatRef.current || [];
        console.log('Original flat.current schedules:', originalFlat);

        const toCreate = buildCreatePayload(schedules, venueID);
        const toUpdate = buildUpdatePayload(schedules, venueID, originalFlat);
        const toDelete = buildDeleteIds(schedules, originalFlat);

        if (toDelete.length) {
          await Promise.all(toDelete.map((id) => deleteVenueScheduleById(id)));
        }
        if (toUpdate.length) {
          await updateVenueSchedules(toUpdate);
        }
        if (toCreate.length) {
          await createVenueSchedules(toCreate);
        }

        if (image) {
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
        }

        const updated = await patchVenue(venueID, fields);
        console.log('Venue actualizado remoto:', updated);

        const mapped = updated?.fields
          ? { venueID: updated.venueID, ...updated.fields }
          : updated?.venueID
          ? updated
          : { venueID, ...fields };

        await dispatch(upsertVenuesFromAPIThunk([mapped]));
      } else {
        await dispatch(
          editVenueLocal({
            venueID,
            venueName: fields.venueName,
            venueCategory: fields.venueCategory,
            venueLocation: fields.venueLocation,
            venueAddress: fields.venueAddress,
            venueDescription: fields.venueDescription,
            venueContact: fields.venueContact,
            latitude: fields.latitude,
            longitud: fields.longitude,
            negocio: fields.negocio,
            userID: Array.isArray(fields.userID)
              ? fields.userID[0]
              : fields.userID,
          })
        ).unwrap();

        if (image) {
          await uploadVenueImage(venueID, image);
        }
      }

      router.push('/(tabs)/perfil/negocios');
    } catch (e) {
      console.error('Editar venue falló', e);
      setError('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!venue) {
    return (
      <AuthBackground>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <AuthCard
            style={{
              height: 744,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              paddingTop: 20,
              paddingBottom: 24,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text>Cargando…</Text>
          </AuthCard>
        </View>
      </AuthBackground>
    );
  }

  return (
    <AuthBackground>
      <ScrollView contentContainerStyle={{ paddingTop: 108, flexGrow: 1, justifyContent: 'flex-end' }}>
        <AuthCard
          style={{
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            paddingTop: 20,
            paddingBottom: 24,
          }}
        >
          <View style={{ gap: 25, paddingHorizontal: 30, paddingBottom: 32 }}>
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
                Editar negocio
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
                    onChangeText={(t) =>
                      setForm((f) => ({ ...f, venueName: t }))
                    }
                    placeholder="Nombre del establecimiento"
                  />
                  <Text style={{ fontSize: 14, color: '#1B2222' }}>
                    Dirección:
                  </Text>
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
                  <Text style={{ fontSize: 14, color: '#1B2222' }}>
                    Ubicación:
                  </Text>
                  <Select
                    value={form.venueLocation}
                    onChange={(val) =>
                      setForm((f) => ({ ...f, venueLocation: val }))
                    }
                    options={VENUE_LOCATIONS}
                    placeholder="Seleccionar"
                    style={{ maxWidth: '100%', height: 40 }}
                  />
                  <Text style={{ fontSize: 14, color: '#1B2222' }}>
                    Categoria:
                  </Text>
                  <Select
                    value={form.venueCategory}
                    onChange={(val) =>
                      setForm((f) => ({ ...f, venueCategory: val }))
                    }
                    options={VENUE_CATEGORIES}
                    placeholder="Seleccionar"
                    style={{ maxWidth: '100%', height: 40 }}
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
                </View>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 14, color: '#1B2222' }}>
                  Nombre del establecimiento:
                </Text>
                <AuthInput
                  value={form.venueName}
                  onChangeText={(t) =>
                    setForm((f) => ({ ...f, venueName: t }))
                  }
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
                  style={{ maxWidth: '100%', height: 40 }}
                />
                <Text style={{ fontSize: 14, color: '#1B2222' }}>Categoria:</Text>
                <Select
                  value={form.venueCategory}
                  onChange={(val) =>
                    setForm((f) => ({ ...f, venueCategory: val }))
                  }
                  options={VENUE_CATEGORIES}
                  placeholder="Seleccionar"
                  style={{ maxWidth: '100%', height: 40 }}
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
                      <View key={segIdx} style={{ flexDirection: 'row', gap: 10 }}>
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
              style={{ ...inputStyle, minHeight: 94, textAlignVertical: 'top' }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 14, color: '#1B2222' }}>¿Es negocio?</Text>
              <Switch
                value={form.negocio}
                onValueChange={(v) => setForm((f) => ({ ...f, negocio: v }))}
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
                label={saving ? 'Guardando…' : 'Guardar cambios'}
                onPress={onSave}
                disabled={saving}
                style={{ flex: 1, backgroundColor: '#F49DB6' }}
                textStyle={{ color: '#1B2222' }}
              />
            </View>
          </View>
        </AuthCard>
      </ScrollView>
    </AuthBackground>
  );
}
