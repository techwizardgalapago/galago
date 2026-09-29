// src/app/(tabs)/perfil/negocios/eventos/[eventID]/editar/index.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import AuthBackground from '../../../../../../../components/auth/AuthBackground';
import AuthCard from '../../../../../../../components/auth/AuthCard';
import AuthButton from '../../../../../../../components/auth/AuthButton';
import AuthInput from '../../../../../../../components/auth/AuthInput';
import Select from '../../../../../../../components/Select';
import { useMedia } from '../../../../../../../hooks/useMedia';

import {
  patchEvent,
  uploadEventImage,
  deleteEventImage,
  reorderEventImages,
  getEventById,
} from '../../../../../../../services/eventsService';
import {
  editEventLocal,
  upsertEventsFromAPIThunk,
} from '../../../../../../../store/slices/eventsSlice';
import { useTabBarInset } from "../../../../../../../hooks/useTabBarInset";
import PhotoGallery from '../../../../../../../components/PhotoGallery';
import { parseAttachmentImages } from '../../../../../../../features/attachments/images';

// ---------- Constantes ----------
const MAX_IMAGENES = 6;

const EVENT_TAGS = [
  'Live Music',
  'Community Art',
  'Food Experience',
  'Movies',
  'Open Air',
  'Drinks & Cocktails',
];

const compressImageWeb = (uri) =>
  new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX = 1200;
      let w = img.width;
      let h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.75);
    };
    img.src = uri;
  });

// ---------- Helpers de fecha ----------
const pad = (n) => String(n).padStart(2, '0');

const formatDate = (date) => {
  if (!date) return 'Seleccionar';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Seleccionar';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatTime = (date) => {
  if (!date) return '--:--';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--:--';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toLocalDatetimeString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const safeDate = (value) => {
  if (!value) return new Date();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
};

// ---------- Componente principal ----------
export default function EditarEventoScreen() {
  const tabBarInset = useTabBarInset();
  const { eventID } = useLocalSearchParams();
  const dispatch = useDispatch();
  const { isDesktop, isWide } = useMedia();
  const isDesktopLayout = isDesktop || isWide;

  const eventFromStore = useSelector((s) =>
    (s.events?.list || []).find((e) => e.eventID === eventID)
  );

  const myVenues = useSelector((s) => {
    const uid = s.auth?.user?.userID;
    if (!uid) return [];
    return (s.venues?.list || []).filter((v) => {
      const val = v?.userID;
      return Array.isArray(val) ? val.includes(uid) : val === uid;
    });
  });

  const venueOptions = useMemo(
    () => myVenues.map((v) => ({ label: v.venueName || 'Sin nombre', value: v.venueID })),
    [myVenues]
  );

  const [form, setForm] = useState({
    eventVenueID: '',
    eventName: '',
    eventDescription: '',
    eventPrice: '0',
    eventCapacity: '',
    telOrganizador: '',
  });

  const [selectedTags, setSelectedTags] = useState([]);

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [images, setImages] = useState([]);
  const [imagenesGuardadas, setImagenesGuardadas] = useState([]);
  const [borrandoImagen, setBorrandoImagen] = useState(null);
  const [ordenandoImagenes, setOrdenandoImagenes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const [pickerConfig, setPickerConfig] = useState(null); // { field: 'start'|'end', mode: 'date'|'time' }

  // Inicializar desde store o API
  useEffect(() => {
    let active = true;
    const init = async (ev) => {
      if (!ev) return;
      setForm({
        eventVenueID: Array.isArray(ev.eventVenueID) ? (ev.eventVenueID[0] || '') : (ev.eventVenueID || ''),
        eventName: ev.eventName || '',
        eventDescription: ev.eventDescription || '',
        eventPrice: ev.eventPrice != null ? String(ev.eventPrice) : '0',
        eventCapacity: ev.eventCapacity != null ? String(ev.eventCapacity) : '',
        telOrganizador: ev.TelOrganizador || ev.telOrganizador || '',
      });

      // Cargar tags existentes como array
      const existingTags = Array.isArray(ev.eventTags)
        ? ev.eventTags
        : typeof ev.eventTags === 'string' && ev.eventTags.trim()
        ? ev.eventTags.split(',').map((t) => t.trim())
        : [];
      if (active) setSelectedTags(existingTags.filter((t) => EVENT_TAGS.includes(t)));
      setStartDate(safeDate(ev.startTime));
      setEndDate(safeDate(ev.endTime));

      // Imagenes existentes
      if (active) setImagenesGuardadas(parseAttachmentImages(ev.eventImage));

      if (active) setLoaded(true);
    };

    if (eventFromStore) {
      init(eventFromStore);
    } else if (eventID) {
      getEventById(eventID)
        .then((res) => {
          const data = res?.fields ? { eventID: res.id ?? eventID, ...res.fields } : res;
          if (active) init(data);
        })
        .catch((e) => console.warn('EditarEventoScreen - load failed:', e?.message));
    }

    return () => { active = false; };
  }, [eventFromStore, eventID]);

  const huecosLibres = Math.max(
    0,
    MAX_IMAGENES - imagenesGuardadas.length - images.length
  );

  const pickImage = async () => {
    if (huecosLibres === 0) {
      setError(`Un evento admite como máximo ${MAX_IMAGENES} imágenes`);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: huecosLibres,
    });
    if (res.canceled) return;
    // Se recorta igualmente: en web `selectionLimit` no siempre se respeta.
    const elegidas = (res.assets ?? []).slice(0, huecosLibres).map((asset, i) => ({
      uri: asset.uri,
      name: asset.fileName || `event_${Date.now()}_${i}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    }));
    setImages((previas) => [...previas, ...elegidas]);
  };

  const quitarImagenNueva = (uri) =>
    setImages((previas) => previas.filter((img) => img.uri !== uri));

  // Igual que en los locales: borrar y reordenar se guardan al momento y no al
  // pulsar guardar, para que la portada en pantalla sea la almacenada.
  const refrescarEvento = async () => {
    const completo = await getEventById(eventID);
    if (!completo) return;
    const ev = completo?.fields ? completo.fields : completo;
    setImagenesGuardadas(parseAttachmentImages(ev.eventImage));
    await dispatch(upsertEventsFromAPIThunk([completo]));
  };

  const quitarImagenGuardada = async (filename) => {
    if (!filename || borrandoImagen || ordenandoImagenes) return;
    setBorrandoImagen(filename);
    try {
      await deleteEventImage(eventID, filename);
      await refrescarEvento();
    } catch (e) {
      console.warn('No se pudo borrar la imagen:', e?.message || e);
      setError('No se pudo borrar la imagen');
    } finally {
      setBorrandoImagen(null);
    }
  };

  const moverImagen = async (desde, hasta) => {
    if (ordenandoImagenes || borrandoImagen) return;
    if (hasta < 0 || hasta >= imagenesGuardadas.length) return;

    const reordenadas = [...imagenesGuardadas];
    const [movida] = reordenadas.splice(desde, 1);
    reordenadas.splice(hasta, 0, movida);

    setOrdenandoImagenes(true);
    try {
      await reorderEventImages(
        eventID,
        reordenadas.map((img) => img.filename)
      );
      await refrescarEvento();
    } catch (e) {
      console.warn('No se pudo reordenar las imagenes:', e?.message || e);
      setError('No se pudo cambiar el orden de las fotos');
    } finally {
      setOrdenandoImagenes(false);
    }
  };

  const handlePickerChange = (event, selected) => {
    if (Platform.OS === 'android') setPickerConfig(null);
    if (event.type === 'dismissed' || !selected) {
      setPickerConfig(null);
      return;
    }
    const { field, mode } = pickerConfig;
    const isStart = field === 'start';
    const current = new Date(isStart ? startDate : endDate);

    if (mode === 'date') {
      current.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      current.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }

    if (isStart) setStartDate(new Date(current));
    else setEndDate(new Date(current));

    if (Platform.OS === 'ios') setPickerConfig(null);
  };

  // ---------- Validación ----------
  const validate = () => {
    const errs = [];
    if (!form.eventName?.trim()) errs.push('Nombre del evento requerido');
    if (!form.eventDescription?.trim()) errs.push('Descripción requerida');
    if (startDate >= endDate) errs.push('La fecha de inicio debe ser antes de la fecha de fin');
    setError(errs[0] || '');
    return errs.length === 0;
  };

  // ---------- Guardar ----------
  const onSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const selectedVenue = myVenues.find((v) => v.venueID === form.eventVenueID);

      const fieldsPatch = {
        eventName: form.eventName.trim(),
        eventDescription: form.eventDescription.trim(),
        eventVenueID: form.eventVenueID ? [form.eventVenueID] : undefined,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        eventPrice: form.eventPrice ? Number(form.eventPrice) : 0,
        eventCapacity: form.eventCapacity ? Number(form.eventCapacity) : undefined,
        eventTags: selectedTags.length ? selectedTags : undefined,
        TelOrganizador: form.telOrganizador.trim() || undefined,
      };

      await patchEvent(eventID, fieldsPatch);

      if (images.length) {
        if (Platform.OS === 'web') {
          // Todas en una sola peticion: el backend las anade a las que ya hay.
          const formData = new FormData();
          for (const img of images) {
            const blob = await compressImageWeb(img.uri);
            formData.append(
              'images',
              new File([blob], img.name || 'event.jpg', { type: 'image/jpeg' })
            );
          }
          await uploadEventImage(eventID, formData);
        } else {
          await uploadEventImage(eventID, images);
        }
        try {
          await new Promise((r) => setTimeout(r, 2000));
          const eventFull = await getEventById(eventID);
          if (eventFull) await dispatch(upsertEventsFromAPIThunk([eventFull]));
        } catch (_) {}
      }

      dispatch(editEventLocal({ eventID, ...fieldsPatch }));

      router.back();
    } catch (e) {
      console.error('Editar evento falló:', e?.response?.data || e);
      setError('No se pudo guardar el evento. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Estilos compartidos ----------
  const nativeDateBtn = {
    flex: 1,
    backgroundColor: '#EDEDED',
    borderRadius: 50,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  };
  const nativeDateBtnText = { fontSize: 14, color: '#1B2222' };
  const webInputStyle = {
    backgroundColor: '#EDEDED',
    borderRadius: 50,
    border: 'none',
    paddingLeft: 16,
    paddingRight: 16,
    height: 40,
    fontSize: 14,
    color: '#1B2222',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const leftFields = (
    <>
      <Text style={{ fontSize: 14, color: '#1B2222' }}>Nombre del evento:</Text>
      <AuthInput
        value={form.eventName}
        onChangeText={(t) => setForm((f) => ({ ...f, eventName: t }))}
        placeholder="Nombre del evento"
      />
      <Text style={{ fontSize: 14, color: '#1B2222' }}>Negocio:</Text>
      <Select
        value={form.eventVenueID}
        onChange={(val) => setForm((f) => ({ ...f, eventVenueID: val }))}
        options={venueOptions.length ? venueOptions : [{ label: 'Sin negocios registrados', value: '' }]}
        placeholder="Seleccionar negocio"
        style={{ maxWidth: '100%', height: 40 }}
      />
      <Text style={{ fontSize: 14, color: '#1B2222' }}>Inicio:</Text>
      {Platform.OS === 'web' ? (
        <input
          type="datetime-local"
          value={toLocalDatetimeString(startDate)}
          onChange={(e) => e.target.value && setStartDate(new Date(e.target.value))}
          style={webInputStyle}
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setPickerConfig({ field: 'start', mode: 'date' })} style={nativeDateBtn}>
            <Text style={nativeDateBtnText}>{formatDate(startDate)}</Text>
          </Pressable>
          <Pressable onPress={() => setPickerConfig({ field: 'start', mode: 'time' })} style={nativeDateBtn}>
            <Text style={nativeDateBtnText}>{formatTime(startDate)}</Text>
          </Pressable>
        </View>
      )}
      <Text style={{ fontSize: 14, color: '#1B2222' }}>Fin:</Text>
      {Platform.OS === 'web' ? (
        <input
          type="datetime-local"
          value={toLocalDatetimeString(endDate)}
          onChange={(e) => e.target.value && setEndDate(new Date(e.target.value))}
          style={webInputStyle}
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setPickerConfig({ field: 'end', mode: 'date' })} style={nativeDateBtn}>
            <Text style={nativeDateBtnText}>{formatDate(endDate)}</Text>
          </Pressable>
          <Pressable onPress={() => setPickerConfig({ field: 'end', mode: 'time' })} style={nativeDateBtn}>
            <Text style={nativeDateBtnText}>{formatTime(endDate)}</Text>
          </Pressable>
        </View>
      )}
      <Text style={{ fontSize: 14, color: '#1B2222' }}>Teléfono organizador:</Text>
      <AuthInput
        value={form.telOrganizador}
        onChangeText={(t) => setForm((f) => ({ ...f, telOrganizador: t }))}
        placeholder="Número de contacto"
        keyboardType="phone-pad"
      />
    </>
  );

  const rightFields = (
    <>
      <Text style={{ fontSize: 14, color: '#1B2222' }}>Precio (0 = Gratis):</Text>
      <AuthInput
        value={form.eventPrice}
        onChangeText={(t) => setForm((f) => ({ ...f, eventPrice: t }))}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <Text style={{ fontSize: 14, color: '#1B2222' }}>Capacidad:</Text>
      <AuthInput
        value={form.eventCapacity}
        onChangeText={(t) => setForm((f) => ({ ...f, eventCapacity: t }))}
        placeholder="Número de personas (opcional)"
        keyboardType="number-pad"
      />
      <Text style={{ fontSize: 14, color: '#1B2222' }}>Tags:</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {EVENT_TAGS.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 50,
                backgroundColor: active ? '#F26719' : '#EDEDED',
              }}
            >
              <Text style={{ fontSize: 13, color: active ? '#fff' : '#1B2222' }}>{tag}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: '#1B2222', flex: 1 }}>Imagen:</Text>
        <Pressable
          onPress={pickImage}
          style={{ backgroundColor: '#EDEDED', height: 34, borderRadius: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}
        >
          <Text style={{ color: '#99A0A0', fontSize: 14 }}>Seleccionar</Text>
        </Pressable>
      </View>
      <PhotoGallery
        guardadas={imagenesGuardadas}
        nuevas={images}
        onQuitarGuardada={quitarImagenGuardada}
        onQuitarNueva={quitarImagenNueva}
        onMover={moverImagen}
        borrando={borrandoImagen}
        ordenando={ordenandoImagenes}
      />
    </>
  );

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
            paddingBottom: 24 + tabBarInset,
          }}
        >
          <Pressable onPress={() => router.back()} style={{ position: 'absolute', top: 16, right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <Ionicons name="arrow-back" size={18} color="#1B2222" />
          </Pressable>

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
              <Text style={{ fontSize: 26, fontWeight: '600', color: '#1B2222', textAlign: 'center' }}>
                Editar Evento
              </Text>
            </View>

            {isDesktopLayout ? (
              <View style={{ flexDirection: 'row', gap: 24 }}>
                <View style={{ flex: 1, gap: 25 }}>{leftFields}</View>
                <View style={{ flex: 1, gap: 25 }}>{rightFields}</View>
              </View>
            ) : (
              <View style={{ gap: 25 }}>
                {leftFields}
                {rightFields}
              </View>
            )}

            <Text style={{ fontSize: 14, color: '#1B2222' }}>Descripción del evento:</Text>
            <TextInput
              value={form.eventDescription}
              onChangeText={(t) => setForm((f) => ({ ...f, eventDescription: t }))}
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

      {pickerConfig && Platform.OS !== 'web' ? (
        <DateTimePicker
          value={pickerConfig.field === 'start' ? startDate : endDate}
          mode={pickerConfig.mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePickerChange}
        />
      ) : null}
    </AuthBackground>
  );
}
