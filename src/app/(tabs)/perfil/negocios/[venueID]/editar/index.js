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

import Container from '../../../../../../components/Container';
import Input from '../../../../../../components/Input';
import Select from '../../../../../../components/Select';

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
];
const VENUE_LOCATIONS = ['Isla San Cristobal', 'Isla Isabela', 'Isla Santa Cruz'];

const inputStyle = {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: Platform.select({ ios: 12, android: 10, default: 8 }),
  backgroundColor: '#fff',
};

// ⬇️ ahora TimeSelect usa el Select global (mismo estilo que tus selects)
const TimeSelect = ({ value, onChange }) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={ALLOWED_TIMES}
      placeholder={null}
      style={{ flex: 1 }}
    />
  );
};

const Field = ({ label, children }) => (
  <View style={{ flex: 1, gap: 6 }}>
    <Text style={{ fontWeight: '600' }}>{label}</Text>
    {children}
  </View>
);

const btn = { backgroundColor: '#111', paddingVertical: 14, borderRadius: 12 };

export default function EditVenueScreen() {
  const { venueID } = useLocalSearchParams();
  const dispatch = useDispatch();
  const venue = useSelector((s) => selectVenueByIdFromState(s, venueID));
  const authUser = useSelector((s) => s.auth?.user);

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
      const fields = {
        venueCategory: form.venueCategory,
        venueLocation: form.venueLocation,
        venueAddress: form.venueAddress || '',
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
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
      <Container centered>
        <Text>Cargando…</Text>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView
        contentContainerStyle={{
          paddingVertical: 16,
          paddingBottom: 32,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Editar negocio</Text>

        <Field label="Nombre">
          <Input
            value={form.venueName}
            onChangeText={(t) =>
              setForm((f) => ({ ...f, venueName: t }))
            }
            placeholder="Mi Café Galápagos"
          />
        </Field>

        <Field label="Categoría">
          <Select
            value={form.venueCategory}
            onChange={(v) =>
              setForm((f) => ({ ...f, venueCategory: v }))
            }
            options={VENUE_CATEGORIES}
            placeholder={null}
          />
        </Field>

        <Field label="Ubicación">
          <Select
            value={form.venueLocation}
            onChange={(v) =>
              setForm((f) => ({ ...f, venueLocation: v }))
            }
            options={VENUE_LOCATIONS}
            placeholder={null}
          />
        </Field>

        <Field label="Dirección">
          <Input
            value={form.venueAddress}
            onChangeText={(t) =>
              setForm((f) => ({ ...f, venueAddress: t }))
            }
            placeholder="Av. Charles Darwin"
          />
        </Field>

        <Field label="Teléfono de contacto">
          <Input
            value={form.venueContact}
            onChangeText={(t) =>
              setForm((f) => ({ ...f, venueContact: t }))
            }
            keyboardType="phone-pad"
            placeholder="+593 99 123 4567"
          />
        </Field>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field label="Latitud (opcional)">
            <Input
              value={form.latitude}
              onChangeText={(t) =>
                setForm((f) => ({ ...f, latitude: t }))
              }
              placeholder="-0.747383"
              keyboardType="decimal-pad"
            />
          </Field>
          <Field label="Longitud (opcional)">
            <Input
              value={form.longitude}
              onChangeText={(t) =>
                setForm((f) => ({ ...f, longitude: t }))
              }
              placeholder="-90.313163"
              keyboardType="decimal-pad"
            />
          </Field>
        </View>

        <Field label="Descripción">
          <TextInput
            value={form.venueDescription}
            onChangeText={(t) =>
              setForm((f) => ({ ...f, venueDescription: t }))
            }
            placeholder="Describe tu negocio..."
            multiline
            style={[inputStyle, { minHeight: 90, textAlignVertical: 'top' }]}
          />
        </Field>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontWeight: '600' }}>¿Es negocio?</Text>
          <Switch
            value={form.negocio}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, negocio: v }))
            }
          />
        </View>

        {/* Utilidades horarios */}
        <View
          style={{
            marginTop: 8,
            flexDirection: 'row',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
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

        {/* Horarios multi-franja */}
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

        {/* Imagen opcional */}
        <View style={{ gap: 6, marginTop: 8 }}>
          <Text style={{ fontWeight: '700' }}>Imagen (opcional)</Text>
          {image ? (
            <View style={{ gap: 8 }}>
              <Image
                source={{ uri: image.uri }}
                style={{ width: '100%', height: 160, borderRadius: 10 }}
              />
              <Pressable
                onPress={() => setImage(null)}
                style={{
                  padding: 10,
                  backgroundColor: '#eee',
                  borderRadius: 10,
                }}
              >
                <Text>Quitar imagen</Text>
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
                Seleccionar imagen
              </Text>
            </Pressable>
          )}
        </View>

        {!!error && <Text style={{ color: '#c00' }}>{error}</Text>}

        <Pressable
          onPress={onSave}
          disabled={saving}
          style={[btn, saving && { opacity: 0.6 }]}
        >
          <Text
            style={{
              color: 'white',
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Text>
        </Pressable>
      </ScrollView>
    </Container>
  );
}
