// src/app/(tabs)/perfil/negocios/[venueID]/editar/index.js
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Platform, View, Text, TextInput, Pressable, ScrollView, Switch, Image, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

import {
  selectVenueByIdFromState,
  upsertVenuesFromAPIThunk,
  editVenueLocal,
} from '../../../../../../store/slices/venueSlice';

import {
  patchVenue,
  uploadVenueImage,
  createVenueSchedules,       // POST batch [{fields:{...}}]
  updateVenueSchedules,       // PUT batch   [{id, fields:{...}}]
  deleteVenueScheduleById,    // DELETE /venues-schedule/:id
} from '../../../../../../services/venuesService';

import { 
  ALLOWED_TIMES, 
  groupVenueSchedules, 
  flattenOriginal, 
  buildDefaultSchedules, 
  buildCreatePayload,
  buildUpdatePayload,
  buildDeleteIds,
  validateDaySegments
} from '../../../../../../features/venues/schedules';


const VENUE_CATEGORIES = ["Restaurante","Café","Club","Bar","Teatro","Spa","Museo","Centro Turístico","Casa Cultural","Parque"];
const VENUE_LOCATIONS = ["Isla San Cristobal","Isla Isabela","Isla Santa Cruz"];

// ----------- UI COMPONENTS -----------
const inputStyle = {
  borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
  paddingHorizontal: 14, paddingVertical: Platform.select({ ios: 12, android: 10, default: 8 }),
  backgroundColor: '#fff',
};

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

const Field = ({ label, children }) => (
  <View style={{ flex: 1, gap: 6 }}>
    <Text style={{ fontWeight: '600' }}>{label}</Text>
    {children}
  </View>
);

const btn = { backgroundColor: '#111', paddingVertical: 14, borderRadius: 12 };

// ---------------- SCREEN ----------------
export default function EditVenueScreen() {
  const { venueID } = useLocalSearchParams();
  const dispatch = useDispatch();
  const venue = useSelector((s) => selectVenueByIdFromState(s, venueID));
  const authUser = useSelector(s => s.auth?.user);

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
  const originalFlatRef = useRef([]); // lo que vino del backend para diff

  const [image, setImage] = useState(null); // { uri, name, type }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Derivadas útiles
  const anyDayEnabled = useMemo(() => schedules.some(d => d.enabled), [schedules]);

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
      longitude: (venue.longitud ?? venue.longitude ?? '')?.toString(), // SQLite usa "longitud"
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

  // -------- utilidades horarios (UI) -------
  const setDayEnabled = (dayIdx, v) => {
    setSchedules(prev => {
      const copy = [...prev];
      const day = { ...copy[dayIdx] };
      day.enabled = v;
      // si se habilita y no hay segmentos, poner uno por defecto
      if (v && (!day.segments || day.segments.length === 0)) {
        day.segments = [{ id: undefined, openingTime_: '08:00', closingTime_: '22:00' }];
      }
      copy[dayIdx] = day;
      return copy;
    });
  };

  const setSegmentValue = (dayIdx, segIdx, patch) => {
    setSchedules(prev => {
      const copy = [...prev];
      const day = { ...copy[dayIdx] };
      const segs = [...day.segments];
      segs[segIdx] = { ...segs[segIdx], ...patch }; // preserva id
      day.segments = segs;
      copy[dayIdx] = day;
      return copy;
    });
  };

  const removeSegment = (dayIdx, segIdx) => {
    setSchedules(prev => {
      const copy = [...prev];
      const day = { ...copy[dayIdx] };
      const segs = day.segments.filter((_, i) => i !== segIdx);
      day.segments = segs.length ? segs : [{ id: undefined, openingTime_: '08:00', closingTime_: '22:00' }];
      copy[dayIdx] = day;
      return copy;
    });
  };

  const addSegment = (dayIdx) => {
    setSchedules(prev => {
      const copy = [...prev];
      const day = { ...copy[dayIdx] };
      day.segments = [...day.segments, { id: undefined, openingTime_: '15:00', closingTime_: '20:00' }];
      copy[dayIdx] = day;
      return copy;
    });
  };

  const quickFillDay = (dayIdx, open = '08:00', close = '22:00') => {
    setSchedules(prev => {
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
    setSchedules(prev =>
      prev.map((d, i) =>
        i === 0 ? d : { ...d, enabled: true, segments: monday.segments.map(s => ({ id: undefined, openingTime_: s.openingTime_, closingTime_: s.closingTime_ })) }
      )
    );
  };

  const markDayClosed = (dayIdx) => {
    setSchedules(prev => {
      const copy = [...prev];
      copy[dayIdx] = { ...copy[dayIdx], enabled: false, segments: [{ id: undefined, openingTime_: '08:00', closingTime_: '22:00' }] };
      return copy;
    });
  };

  // ------------- validate form -------------
  const validate = () => {
    const errs = [];
    if (!form.venueName?.trim()) errs.push('Nombre requerido');

    // Validación de horarios (opcional pero útil)
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
      // Campos comunes
      const fields = {
        venueCategory: form.venueCategory,
        venueLocation: form.venueLocation,
        venueAddress: form.venueAddress || '',
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined, // backend usa longitude
        venueName: form.venueName,
        venueDescription: form.venueDescription,
        negocio: !!form.negocio,
        userID: [authUser?.userID] || null,
        venueContact: form.venueContact || '',
      };

      if (Platform.OS === 'web') {
        // 1) Diff y sync horarios
        const originalFlat = originalFlatRef.current || [];
        console.log('Original flat.current schedules:', originalFlatRef);
        const toCreate = buildCreatePayload(schedules, venueID);
        const toUpdate = buildUpdatePayload(schedules, venueID, originalFlat);
        const toDelete = buildDeleteIds(schedules, originalFlat);

        if (toDelete.length) {
          await Promise.all(toDelete.map(id => deleteVenueScheduleById(id)));
        }
        if (toUpdate.length) {
          await updateVenueSchedules(toUpdate);
        }
        if (toCreate.length) {
          await createVenueSchedules(toCreate);
        }

        // 2) Imagen opcional
        if (image) {
          const res = await fetch(image.uri);
          const blob = await res.blob();
          const file = new File([blob], image.name || 'venue.jpg', { type: blob.type || image.type || 'image/jpeg' });
          const formData = new FormData();
          formData.append('image', file);
          await uploadVenueImage(venueID, formData);
        }

        // 3) PUT venue remoto
        const updated = await patchVenue(venueID, fields);
        console.log('Venue actualizado remoto:', updated);
        const mapped = updated?.fields
          ? { venueID: updated.venueID, ...updated.fields }
          : (updated?.venueID ? updated : { venueID, ...fields });
        console.log("mapped after patchVenue:", mapped);
        await dispatch(upsertVenuesFromAPIThunk([mapped]));


        
      } else {
        // 📱 NATIVE → local-first del venue
        await dispatch(editVenueLocal({
          venueID,
          venueName: fields.venueName,
          venueCategory: fields.venueCategory,
          venueLocation: fields.venueLocation,
          venueAddress: fields.venueAddress,
          venueDescription: fields.venueDescription,
          venueContact: fields.venueContact,
          latitude: fields.latitude,
          longitud: fields.longitude, // mapea a "longitud" (SQLite)
          negocio: fields.negocio,
          userID: Array.isArray(fields.userID) ? fields.userID[0] : fields.userID,
        })).unwrap();

        // (Opcional) imagen en native
        if (image) {
          await uploadVenueImage(venueID, image);
        }

        // (Opcional) si quieres también sincronizar horarios en native, aquí puedes
        // llamar a los mismos servicios remotos (create/update/delete).
      }

      router.push(`/(tabs)/perfil/negocios`)
    } catch (e) {
      console.error('Editar venue falló', e);
      setError('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!venue) {
    return <View style={{ padding: 16 }}><Text>Cargando…</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Editar negocio</Text>

      <Field label="Nombre">
        <TextInput value={form.venueName} onChangeText={(t)=>setForm(f=>({...f, venueName:t}))} style={inputStyle} />
      </Field>

      <Field label="Categoría">
        <View style={{ ...inputStyle, paddingHorizontal: 0 }}>
          <Picker selectedValue={form.venueCategory} onValueChange={(v)=>setForm(f=>({...f, venueCategory:v}))}>
            {VENUE_CATEGORIES.map(c=><Picker.Item key={c} label={c} value={c} />)}
          </Picker>
        </View>
      </Field>

      <Field label="Ubicación">
        <View style={{ ...inputStyle, paddingHorizontal: 0 }}>
          <Picker selectedValue={form.venueLocation} onValueChange={(v)=>setForm(f=>({...f, venueLocation:v}))}>
            {VENUE_LOCATIONS.map(c=><Picker.Item key={c} label={c} value={c} />)}
          </Picker>
        </View>
      </Field>

      <Field label="Dirección">
        <TextInput value={form.venueAddress} onChangeText={(t)=>setForm(f=>({...f, venueAddress:t}))} style={inputStyle} />
      </Field>

      <Field label="Teléfono de contacto">
        <TextInput value={form.venueContact} onChangeText={(t)=>setForm(f=>({...f, venueContact:t}))} style={inputStyle} keyboardType="phone-pad" />
      </Field>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Latitud (opcional)">
          <TextInput
            value={form.latitude}
            onChangeText={(t)=>setForm(f=>({...f, latitude:t}))}
            placeholder="-0.747383"
            keyboardType="decimal-pad"
            style={inputStyle}
          />
        </Field>
        <Field label="Longitud (opcional)">
          <TextInput
            value={form.longitude}
            onChangeText={(t)=>setForm(f=>({...f, longitude:t}))}
            placeholder="-90.313163"
            keyboardType="decimal-pad"
            style={inputStyle}
          />
        </Field>
      </View>

      <Field label="Descripción">
        <TextInput
          value={form.venueDescription}
          onChangeText={(t)=>setForm(f=>({...f, venueDescription:t}))}
          placeholder="Describe tu negocio..."
          multiline
          style={[inputStyle, { minHeight: 90, textAlignVertical: 'top' }]}
        />
      </Field>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontWeight: '600' }}>¿Es negocio?</Text>
        <Switch value={form.negocio} onValueChange={(v)=>setForm(f=>({...f, negocio:v}))} />
      </View>

      {/* Utilidades globales para horarios */}
      <View style={{ marginTop: 8, flexDirection:'row', gap:8, flexWrap:'wrap' }}>
        <Pressable onPress={copyMondayToAll} style={{ paddingHorizontal:10, paddingVertical:6, backgroundColor:'#eee', borderRadius:8 }}>
          <Text>Copiar lunes a todos</Text>
        </Pressable>
      </View>

      {/* Horarios con múltiples franjas por día */}
      {schedules.map((day, dayIdx) => (
        <View key={day.weekDay} style={{ borderWidth:1, borderColor:'#eee', borderRadius:10, padding:10, marginTop:8 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontWeight:'600' }}>{day.weekDay}</Text>
            <Switch value={day.enabled} onValueChange={(v)=>setDayEnabled(dayIdx, v)} />
          </View>

          {day.enabled && (
            <>
              <View style={{ flexDirection:'row', gap:8, marginTop:6, flexWrap:'wrap' }}>
                <Pressable onPress={()=>quickFillDay(dayIdx)} style={{ paddingHorizontal:10, paddingVertical:6, backgroundColor:'#eee', borderRadius:8 }}>
                  <Text>Rellenar 08:00–22:00</Text>
                </Pressable>
                <Pressable onPress={()=>markDayClosed(dayIdx)} style={{ paddingHorizontal:10, paddingVertical:6, backgroundColor:'#eee', borderRadius:8 }}>
                  <Text>Marcar cerrado</Text>
                </Pressable>
              </View>

              {day.segments.map((seg, segIdx)=>(
                <View key={segIdx} style={{ flexDirection:'row', gap:10, marginTop:8, alignItems:'center' }}>
                  <TimeSelect
                    value={seg.openingTime_}
                    onChange={(val)=>setSegmentValue(dayIdx, segIdx, { openingTime_: val })}
                  />
                  <TimeSelect
                    value={seg.closingTime_}
                    onChange={(val)=>setSegmentValue(dayIdx, segIdx, { closingTime_: val })}
                  />
                  <Pressable
                    onPress={()=>removeSegment(dayIdx, segIdx)}
                    style={{ paddingHorizontal:10, paddingVertical:6, backgroundColor:'#eee', borderRadius:8 }}
                  >
                    <Text>Eliminar</Text>
                  </Pressable>
                </View>
              ))}

              <Pressable
                onPress={()=>addSegment(dayIdx)}
                style={{ marginTop:8, paddingHorizontal:10, paddingVertical:6, backgroundColor:'#eee', borderRadius:8, alignSelf:'flex-start' }}
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
            <Image source={{ uri: image.uri }} style={{ width: '100%', height: 160, borderRadius: 10 }} />
            <Pressable onPress={() => setImage(null)} style={{ padding: 10, backgroundColor: '#eee', borderRadius: 10 }}>
              <Text>Quitar imagen</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={pickImage} style={{ padding: 12, backgroundColor: '#111', borderRadius: 12 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Seleccionar imagen</Text>
          </Pressable>
        )}
      </View>

      {!!error && <Text style={{ color: '#c00' }}>{error}</Text>}

      <Pressable onPress={onSave} disabled={saving} style={[btn, saving && { opacity: 0.6 }]}>
        <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
