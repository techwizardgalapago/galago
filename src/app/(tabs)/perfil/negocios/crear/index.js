import React, { useState } from 'react';
import { Platform, View, Text, TextInput, Pressable, ScrollView, Switch, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSelector, useDispatch } from 'react-redux';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker'; // ✅ para el select en native

import { createVenue, createVenueSchedules, uploadVenueImage, parseCreatedVenueId } from '../../../../../services/venuesService';
// Intentar reflejar local si existe:
let upsertVenuesFromAPI;
try {
  ({ upsertVenuesFromAPI } = require('../../../../../store/slices/venueSlice'));
} catch (_) {}

const VENUE_CATEGORIES = ["Restaurante","Café","Club","Bar","Teatro","Spa","Museo","Centro Turístico","Casa Cultural","Parque"];
const VENUE_LOCATIONS = ["Isla San Cristobal","Isla Isabela","Isla Santa Cruz"];
const WEEKDAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const ALLOWED_TIMES = [
  "00:00","00:30","01:00","01:30","02:00","02:30","03:00","03:30",
  "04:00","04:30","05:00","05:30","06:00","06:30","07:00","07:30",
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30"
];

// ✅ Select cross-platform de horas con el mismo look que tus inputs
const TimeSelect = ({ value, onChange }) => {
  if (Platform.OS === 'web') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, cursor: 'pointer', flex: 1 }}
      >
        {ALLOWED_TIMES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    );
  }
  return (
    <View style={{ ...inputStyle, paddingHorizontal: 0, flex: 1 }}>
      <Picker selectedValue={value} onValueChange={(val) => onChange(val)} style={{ width: '100%' }}>
        {ALLOWED_TIMES.map((t) => (
          <Picker.Item key={t} label={t} value={t} />
        ))}
      </Picker>
    </View>
  );
};

export default function CrearNegocioScreen() {
  const dispatch = useDispatch();
  const authUser = useSelector(s => s.auth?.user);

  const [form, setForm] = useState({
    venueName: '',
    venueCategory: VENUE_CATEGORIES[0],
    venueLocation: VENUE_LOCATIONS[0],
    venueAddress: '',
    venueDescription: '',
    latitude: '',
    longitude: '',
    negocio: true,
    venueContact: '',
  });

  const [schedules, setSchedules] = useState(
    WEEKDAYS.map(d => ({ weekDay: d, enabled: false, openingTime_: '08:00', closingTime_: '22:00' }))
  );

  const [image, setImage] = useState(null); // { uri, name, type }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const quickFillHours = (open = '08:00', close = '22:00') => {
    setSchedules(prev => prev.map(s => ({ ...s, enabled: true, openingTime_: open, closingTime_: close })));
  };

  const validate = () => {
    const errs = [];
    if (!form.venueName?.trim()) errs.push('Nombre del negocio es requerido');
    if (!form.venueCategory?.trim()) errs.push('Categoría requerida');
    if (!form.venueLocation?.trim()) errs.push('Ubicación requerida');
    if (!form.venueDescription?.trim()) errs.push('Descripción requerida');
    // lat/long opcionales
    setError(errs[0] || '');
    return errs.length === 0;
  };

  const isAllowed = (t) => ALLOWED_TIMES.includes(t);

  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // 1) Crear venue en backend
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

      const venueResp = await createVenue(fields);
      let venueID = parseCreatedVenueId(venueResp) || venueResp?.venueID || venueResp?.id;
      if (!venueID) throw new Error('No se recibió el ID del venue creado');
      console.log('Venue creado con ID:', venueID);

      // 2) Crear horarios si hay días habilitados
      const activeSchedules = schedules.filter(s => s.enabled);
      if (activeSchedules.length > 0) {
        // Validar horas contra la whitelist
        for (const s of activeSchedules) {
          if (!isAllowed(s.openingTime_) || !isAllowed(s.closingTime_)) {
            setError(`Horario inválido para ${s.weekDay}. Usa tiempos como 08:00, 12:30, 22:00.`);
            setSaving(false);
            return;
          }
        }

        const schedulePayload = activeSchedules.map(s => ({
          fields: {
            linkedVenue: [venueID],
            weekDay: s.weekDay,
            openingTime_: s.openingTime_,
            closingTime_: s.closingTime_,
          },
        }));
        console.log('Creando horarios con payload:', schedulePayload);
        await createVenueSchedules(schedulePayload);
      }

      // 3) Subir imagen opcional
      if (image) {
        if (Platform.OS === 'web') {
          const res = await fetch(image.uri);
          console.log('Fetched image for upload:', res);
          const blob = await res.blob();
          console.log('Image blob:', blob);
          const file = new File(
                [blob],
                image.name || 'venue.jpg',
                { type: blob.type || image.type || 'image/jpeg' }
            );
          const formData = new FormData();
          formData.append('image', file);
          for (const [k, v] of formData.entries()) {
            console.log('FD entry:', k, v, v?.name, v?.type, v?.size);
          }
          console.log('Uploading image with formData:', formData);
          await uploadVenueImage(venueID, formData);
        } else {
          await uploadVenueImage(venueID, image);
        }
      }

      // 4) Reflejar local si existe el thunk (opcional)
      if (upsertVenuesFromAPI) {
        // Si tu API devuelve el record completo del venue, puedes pasarlo aquí
        // await dispatch(upsertVenuesFromAPI([remoteVenue]));
      }

      // 5) Volver a "Mis negocios"
      router.replace('/(tabs)/perfil/negocios');
    } catch (e) {
      console.error('Crear negocio falló:', e);
      setError('No se pudo registrar el negocio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Registra tu negocio</Text>

      {/* Nombre */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Nombre</Text>
        <TextInput
          value={form.venueName}
          onChangeText={(t) => setForm(f => ({ ...f, venueName: t }))}
          placeholder="Mi Café Galápagos"
          style={inputStyle}
        />
      </View>

      {/* Categoría */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Categoría</Text>
        <View style={chipRow}>
          {VENUE_CATEGORIES.map(c => {
            const active = form.venueCategory === c;
            return (
              <Pressable key={c} onPress={() => setForm(f => ({ ...f, venueCategory: c }))}
                style={[chip, active && chipActive]}>
                <Text style={{ fontWeight: '600' }}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Ubicación */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Ubicación</Text>
        {Platform.OS === 'web' ? (
          <select
            value={form.venueLocation}
            onChange={(e) => setForm(f => ({ ...f, venueLocation: e.target.value }))}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {VENUE_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        ) : (
          <TextInput
            value={form.venueLocation}
            onChangeText={(t) => setForm(f => ({ ...f, venueLocation: t }))}
            placeholder="Isla Santa Cruz"
            style={inputStyle}
          />
        )}
      </View>

      {/* Dirección */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Dirección</Text>
        <TextInput
          value={form.venueAddress}
          onChangeText={(t) => setForm(f => ({ ...f, venueAddress: t }))}
          placeholder="Av. Charles Darwin"
          style={inputStyle}
        />
      </View>

      {/* Teléfono */}
        <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Teléfono de contacto</Text>
        <TextInput
            value={form.venueContact}
            onChangeText={(t) => setForm(f => ({ ...f, venueContact: t }))}
            placeholder="+593 99 123 4567"
            keyboardType="phone-pad"
            style={inputStyle}
        />
        </View>

      {/* Lat/Long (opcionales) */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600' }}>Latitud (opcional)</Text>
          <TextInput
            value={form.latitude}
            onChangeText={(t) => setForm(f => ({ ...f, latitude: t }))}
            placeholder="-0.747383"
            keyboardType="decimal-pad"
            style={inputStyle}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600' }}>Longitud (opcional)</Text>
          <TextInput
            value={form.longitude}
            onChangeText={(t) => setForm(f => ({ ...f, longitude: t }))}
            placeholder="-90.313163"
            keyboardType="decimal-pad"
            style={inputStyle}
          />
        </View>
      </View>

      {/* Descripción */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Descripción</Text>
        <TextInput
          value={form.venueDescription}
          onChangeText={(t) => setForm(f => ({ ...f, venueDescription: t }))}
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
          onValueChange={(v) => setForm(f => ({ ...f, negocio: v }))}
        />
      </View>

      {/* Horarios */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700' }}>Horarios</Text>
          <Pressable onPress={() => quickFillHours()} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eee', borderRadius: 10 }}>
            <Text>Rellenar 08:00–22:00</Text>
          </Pressable>
        </View>

        {schedules.map((s, idx) => (
          <View key={s.weekDay} style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 10, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '600' }}>{s.weekDay}</Text>
              <Switch
                value={s.enabled}
                onValueChange={(v) => setSchedules(prev => {
                  const copy = [...prev];
                  copy[idx] = { ...copy[idx], enabled: v };
                  return copy;
                })}
              />
            </View>

            {s.enabled && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                {/* ✅ reemplazo: selects de hora uniformes */}
                <TimeSelect
                  value={s.openingTime_}
                  onChange={(val) => setSchedules(prev => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], openingTime_: val };
                    return copy;
                  })}
                />
                <TimeSelect
                  value={s.closingTime_}
                  onChange={(val) => setSchedules(prev => {
                    const copy = [...prev];
                    copy[idx] = { ...copy[idx], closingTime_: val };
                    return copy;
                  })}
                />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Imagen opcional */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '700' }}>Imagen (opcional)</Text>
        {image ? (
          <View style={{ gap: 8 }}>
            <Image source={{ uri: image.uri }} style={{ width: '100%', height: 160, borderRadius: 10 }} />
            <Pressable onPress={() => setImage(null)} style={{ padding: 10, backgroundColor: '#eee', borderRadius: 10 }}>
              <Text>Quitar imagen</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickImage} style={{ padding: 12, backgroundColor: '#111', borderRadius: 12 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
              Seleccionar imagen
            </Text>
          </Pressable>
        )}
      </View>

      {!!error && <Text style={{ color: '#c00' }}>{error}</Text>}

      <Pressable onPress={onSave} disabled={saving} style={[buttonStyle, saving && { opacity: 0.6 }]}>
        <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

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

const buttonStyle = {
  backgroundColor: '#0a6',
  paddingVertical: 14,
  borderRadius: 12,
};
