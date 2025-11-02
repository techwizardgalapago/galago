// src/app/perfil/settings/register.jsx
import React, { useEffect, useState } from 'react';
import { Platform, View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';

import { COUNTRIES } from '../../../../../utils/countries.js';
import { updateUser } from '../../../../../store/slices/userSlice.js';
import { fetchMe } from '../../../../../store/slices/authSlice.js';
import { splitFullName, joinFullName } from '../../../../../features/users/profileComplition.js';
import { patchUserProfile } from '../../../../../services/usersService.js';
import { upsertUsersFromAPI } from '../../../../../store/slices/userSlice.js'; // to mirror remote into local



const USER_ROLES = [
  'Curators & Providers',
  'Explorer',
];

const TRAVEL_REASONS = [
  'Holidays & Leisure',
  'Scientific Research',
  'Conservation & Environmental Management',
  'Educational Programs',
  'Tourism Industry Work',
  "Volunteer & Nonprofit Work",
  "Arts & Cultural Projects"
];

export default function RegisterProfileScreen() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth || {});

  const [form, setForm] = useState({
  fullName: '',
  userEmail: '',
  userRole: 'Curators & Providers',
  countryOfOrigin: '',
  reasonForTravel: '',
  dateOfBirth: '',
});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
  if (!user) return;

  const full = user.fullName || joinFullName(user.firstName, user.lastName);
  const reason =
    Array.isArray(user.reasonForTravel)
      ? user.reasonForTravel[0] || ''
      : user.reasonForTravel || '';

  setForm({
    fullName: full || '',
    userEmail: user.userEmail || '',
    userRole: user.userRole || 'Curators & Providers',
    countryOfOrigin: user.countryOfOrigin || '',
    reasonForTravel: reason,
    dateOfBirth: user.dateOfBirth || '',
  });
}, [user]);


  const validate = () => {
    const errs = [];
    if (!form.fullName?.trim()) errs.push('Name is required');
    if (!form.userEmail?.trim() || !/\S+@\S+\.\S+/.test(form.userEmail)) errs.push('Valid email required');
    if (!form.userRole?.trim()) errs.push('Role is required');
    if (!form.countryOfOrigin?.trim()) errs.push('Country is required');
    if (!form.reasonForTravel) errs.push('Select a reason for travel');
    setError(errs[0] || '');
    return errs.length === 0;
  };

  const onSave = async () => {
    if (!user?.userID) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const { firstName, lastName } = splitFullName(form.fullName);

      // 1) Authoritative backend write (Airtable)
      const remote = await patchUserProfile(user.userID, {
        firstName,
        lastName,
        userEmail: form.userEmail,
        userRole: form.userRole,
        countryOfOrigin: form.countryOfOrigin,
        reasonForTravel: form.reasonForTravel, // string → array in service
        dateOfBirth: form.dateOfBirth, 
      });

      // 2) Mirror to local SQLite/Redux
      // Prefer upserting what backend returned (so we match Airtable exactly)
      if (remote?.user) {
        // `upsertUsersFromAPI` will write to SQLite on native and to Redux (web-safe)
        await dispatch(upsertUsersFromAPI([remote.user]));
      } else {
        // fallback: keep local updated with what we sent
        await dispatch(
          updateUser({
            userID: user.userID,
            firstName,
            lastName,
            userEmail: form.userEmail,
            userRole: form.userRole,
            countryOfOrigin: form.countryOfOrigin,
            reasonForTravel: form.reasonForTravel,
            dateOfBirth: form.dateOfBirth,
          })
        ).unwrap();
    }

    // 3) Keep auth.user in sync
    // Option A: trust server and re-fetch me (authoritative & simple)
    await dispatch(fetchMe());

    // Option B (if you want instant UI without a roundtrip, keep using your local patch):
    // dispatch(setAuthUserPatch({
    //   firstName,
    //   lastName,
    //   fullName: joinFullName(firstName, lastName),
    //   userEmail: form.userEmail,
    //   userRole: form.userRole,
    //   countryOfOrigin: form.countryOfOrigin,
    //   reasonForTravel: form.reasonForTravel,
    // }));

    // 4) Go home
    router.replace('/');
  } catch (e) {
    console.error('Save profile failed', e);
    setError('Could not save. Please try again.');
  } finally {
    setSaving(false);
  }
};


  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Complete your profile</Text>
      <Text style={{ opacity: 0.7 }}>
        We’ll use this info to personalize recommendations and sync your account.
      </Text>

      {/* Full Name */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Full name</Text>
        <TextInput
          value={form.fullName}
          onChangeText={(t) => setForm((f) => ({ ...f, fullName: t }))}
          placeholder="Carlos Dominguez"
          autoCapitalize="words"
          style={inputStyle}
        />
      </View>

      {/* Email */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Email</Text>
        <TextInput
          value={form.userEmail}
          onChangeText={(t) => setForm((f) => ({ ...f, userEmail: t }))}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle}
          // editable={!(user?.googleAccount)} // uncomment to lock email for Google users
        />
      </View>

      {/* Date of Birth */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Date of birth</Text>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) =>
              setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
            }
            style={{
              ...baseSelectStyle,
              width: '100%',
              cursor: 'pointer',
            }}
          />
        ) : (
          <TextInput
            value={form.dateOfBirth}
            onChangeText={(t) => setForm((f) => ({ ...f, dateOfBirth: t }))}
            placeholder="YYYY-MM-DD"
            style={inputStyle}
          />
        )}
      </View>

      {/* Role */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: '600' }}>Role</Text>
        <View style={chipRow}>
          {USER_ROLES.map((r) => {
            const active = form.userRole === r;
            return (
              <Pressable key={r} onPress={() => setForm((f) => ({ ...f, userRole: r }))} style={[chip, active && chipActive]}>
                <Text style={{ fontWeight: '600' }}>{r}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Country */}
<View style={{ gap: 6 }}>
  <Text style={{ fontWeight: '600' }}>Country of origin</Text>

  {Platform.OS === 'web' ? (
    <select
      value={form.countryOfOrigin}
      onChange={(e) =>
        setForm((f) => ({ ...f, countryOfOrigin: e.target.value }))
      }
      style={{
        ...baseSelectStyle,
        width: '100%',
        appearance: 'none', // hides browser arrow for cleaner style
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        cursor: 'pointer',
      }}
    >
      <option value="">Select your country</option>
      {COUNTRIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  ) : (
    <View style={{ ...baseSelectStyle, paddingHorizontal: 0 }}>
      <Picker
        selectedValue={form.countryOfOrigin}
        onValueChange={(val) =>
          setForm((f) => ({ ...f, countryOfOrigin: val }))
        }
        style={{
          width: '100%',
          fontSize: 16,
        }}
        dropdownIconColor="#555"
      >
        <Picker.Item label="Select your country" value="" />
        {COUNTRIES.map((c) => (
          <Picker.Item key={c} label={c} value={c} />
        ))}
      </Picker>
    </View>
  )}
</View>


      {/* Reason for travel */}
<View style={{ gap: 6 }}>
  <Text style={{ fontWeight: '600' }}>Reason for travel</Text>
  <View style={chipRow}>
    {TRAVEL_REASONS.map((r) => {
      const active = form.reasonForTravel === r;
      return (
        <Pressable
          key={r}
          onPress={() =>
            setForm((f) => ({
              ...f,
              reasonForTravel: f.reasonForTravel === r ? '' : r,
            }))
          }
          style={[chip, active && chipActive]}
        >
          <Text style={{ fontWeight: '600' }}>{r}</Text>
        </Pressable>
      );
    })}
  </View>
</View>


      {!!error && <Text style={{ color: '#c00' }}>{error}</Text>}

      <Pressable onPress={onSave} disabled={saving} style={[buttonStyle, saving && { opacity: 0.5 }]}>
        <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>
          {saving ? 'Saving…' : 'Save & Continue'}
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
  backgroundColor: '#111',
  paddingVertical: 14,
  borderRadius: 12,
};

const baseSelectStyle = {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: Platform.select({ ios: 12, android: 10, default: 10 }),
  fontSize: 16,
  backgroundColor: '#fff',
};