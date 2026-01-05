// src/app/(tabs)/perfil/settings/register/index.js
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';
import AuthBackground from '../../../../../components/auth/AuthBackground';
import AuthCard from '../../../../../components/auth/AuthCard';
import Input from '../../../../../components/Input';
import Select from '../../../../../components/Select';

import { COUNTRIES } from '../../../../../utils/countries';
import { updateUser, upsertUsersFromAPI } from '../../../../../store/slices/userSlice';
import { fetchMe } from '../../../../../store/slices/authSlice';
import { splitFullName, joinFullName } from '../../../../../features/users/profileComplition';
import { patchUserProfile } from '../../../../../services/usersService';

// ------------------------
// NEW GENDER OPTIONS
// ------------------------
const GENDER_OPTIONS = [
  'Masculino',
  'Femenino',
  'Utilizo otra palabra para definirme'
];

const USER_ROLES = ['Curators & Providers', 'Explorer'];
const TRAVEL_REASONS = [
  'Holidays & Leisure',
  'Scientific Research',
  'Conservation & Environmental Management',
  'Educational Programs',
  'Tourism Industry Work',
  'Volunteer & Nonprofit Work',
  'Arts & Cultural Projects',
  'Local Resident'
];

export default function RegisterProfileScreen() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth || {});
  const { height: windowHeight } = useWindowDimensions();

  const [form, setForm] = useState({
    fullName: '',
    userEmail: '',
    userRole: USER_ROLES[0],
    countryOfOrigin: '',
    reasonForTravel: '',
    dateOfBirth: '',
    genero: '',       // <-- NEW FIELD
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ------------------------------------------------
  // LOAD EXISTING USER PROFILE
  // ------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const full = user.fullName || joinFullName(user.firstName, user.lastName);
    const reason = Array.isArray(user.reasonForTravel)
      ? user.reasonForTravel[0]
      : user.reasonForTravel || '';

    setForm({
      fullName: full || '',
      userEmail: user.userEmail || '',
      userRole: user.userRole || USER_ROLES[0],
      countryOfOrigin: user.countryOfOrigin || '',
      reasonForTravel: reason,
      dateOfBirth: user.dateOfBirth || '',
      genero: user.genero || '', // <-- LOAD GENDER
    });
  }, [user]);

  // ------------------------------------------------
  // VALIDATION
  // ------------------------------------------------
  const validate = () => {
    const errs = [];
    if (!form.fullName.trim()) errs.push('Name is required');
    if (!form.userEmail.trim() || !/\S+@\S+\.\S+/.test(form.userEmail))
      errs.push('Valid email required');
    if (!form.countryOfOrigin) errs.push('Country is required');
    if (!form.reasonForTravel) errs.push('Reason for travel is required');
    if (!form.genero) errs.push('Gender is required');  // <-- NEW VALIDATION

    setError(errs[0] || '');
    return errs.length === 0;
  };

  // ------------------------------------------------
  // SAVE PROFILE
  // ------------------------------------------------
  const onSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const { firstName, lastName } = splitFullName(form.fullName);

      const remote = await patchUserProfile(user.userID, {
        firstName,
        lastName,
        userEmail: form.userEmail,
        userRole: form.userRole,
        countryOfOrigin: form.countryOfOrigin,
        reasonForTravel: form.reasonForTravel,
        dateOfBirth: form.dateOfBirth,
        genero: form.genero, // <-- SAVE GENDER
      });

      if (remote?.user) {
        await dispatch(upsertUsersFromAPI([remote.user]));
      } else {
        await dispatch(
          updateUser({ userID: user.userID, ...remote })
        );
      }

      await dispatch(fetchMe());
      router.replace('/');
    } catch (e) {
      console.error('Save profile failed', e);
      setError('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------
  return (
    <AuthBackground>
      <View style={styles.scrollContent}>
        <AuthCard style={[styles.card, { minHeight: Math.max(0, windowHeight - 52) }]}>
          <Pressable
            onPress={() => router.push('/(tabs)/perfil/settings')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>×</Text>
          </Pressable>
          <View style={styles.contentWrap}>
            <View style={styles.topBlock}>
              <View style={styles.headerBlock}>
                <Text style={styles.title}>Ajustes De Perfil</Text>
              </View>

              <View style={styles.formBlock}>
                <Text style={styles.inputLabel}>Nombre y Apellido</Text>
                <Input
                  placeholder="Nombre y Apellido"
                  value={form.fullName}
                  onChangeText={(t) => setForm(f => ({ ...f, fullName: t }))}
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>Correo Electrónico</Text>
                <Input
                  placeholder="Correo Electrónico"
                  value={form.userEmail}
                  onChangeText={(t) => setForm(f => ({ ...f, userEmail: t }))}
                  keyboardType="email-address"
                  style={styles.input}
                />

                <Text style={styles.centerLabel}>Fecha de nacimiento:</Text>
                {Platform.OS === 'web' ? (
                  <View style={styles.webDateWrap}>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                      }
                      style={styles.webDateInput}
                    />
                  </View>
                ) : (
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={form.dateOfBirth}
                    onChangeText={(t) =>
                      setForm((f) => ({ ...f, dateOfBirth: t }))
                    }
                    style={styles.input}
                  />
                )}

                <Text style={styles.inputLabel}>Género</Text>
                <Select
                  value={form.genero}
                  onChange={(v) => setForm(f => ({ ...f, genero: v }))}
                  options={GENDER_OPTIONS}
                  placeholder="Seleccione género"
                  style={styles.select}
                />

                <Text style={styles.inputLabel}>Rol</Text>
                <Select
                  value={form.userRole}
                  onChange={(v) => setForm(f => ({ ...f, userRole: v }))}
                  options={USER_ROLES}
                  style={styles.select}
                />

                <Text style={styles.inputLabel}>País de Origen</Text>
                <Select
                  value={form.countryOfOrigin}
                  onChange={(v) => setForm(f => ({ ...f, countryOfOrigin: v }))}
                  options={COUNTRIES}
                  placeholder="Select your country"
                  style={styles.select}
                />

                <Text style={styles.inputLabel}>Motivo del Viaje</Text>
                <Select
                  value={form.reasonForTravel}
                  onChange={(v) => setForm(f => ({ ...f, reasonForTravel: v }))}
                  options={TRAVEL_REASONS}
                  placeholder="Select reason"
                  style={styles.select}
                />
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => router.back()}
                style={[styles.buttonBase, styles.buttonOutline]}
              >
                <Text style={styles.buttonOutlineText}>Regresar</Text>
              </Pressable>
              <Pressable
                onPress={onSave}
                disabled={saving}
                style={[styles.buttonBase, styles.buttonPrimary, saving && styles.buttonDisabled]}
              >
                <Text style={styles.buttonPrimaryText}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </AuthCard>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 52,
    alignItems: 'center',
    flex: 1,
  },
  card: {
    width: '100%',
    maxWidth: 393,
    alignItems: 'center',
    position: 'relative',
    borderRadius: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 28,
  },
  headerBlock: {
    width: '100%',
    marginTop: 37,
    paddingHorizontal: 25,
    paddingTop: 15,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1B2222',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 45,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#1B2222',
  },
  formBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  inputLabel: {
    width: '100%',
    maxWidth: 333,
    fontSize: 14,
    color: '#1B2222',
    textAlign: 'left',
    marginBottom: -6,
  },
  input: {
    height: 34,
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 6,
    fontSize: 14,
    lineHeight: 16,
    textAlignVertical: 'center',
    maxWidth: 333,
  },
  select: {
    height: 34,
    borderRadius: 50,
    paddingHorizontal: 16,
    maxWidth: 333,
  },
  centerLabel: {
    fontSize: 14,
    color: '#1B2222',
    textAlign: 'center',
    marginTop: 6,
  },
  webDateWrap: {
    display: 'flex',
    height: 34,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 50,
    backgroundColor: '#EDEDED',
    maxWidth: 333,
    width: '100%',
  },
  webDateInput: {
    width: '100%',
    height: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 14,
  },
  errorText: {
    color: '#c00',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 25,
  },
  buttonBase: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 80,
    width: 119,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: {
    backgroundColor: '#FDFDFC',
    borderWidth: 2,
    borderColor: '#383A3A',
  },
  buttonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#383A3A',
  },
  buttonPrimary: {
    backgroundColor: '#259D4E',
  },
  buttonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FDFDFC',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
