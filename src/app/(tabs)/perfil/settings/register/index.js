// src/app/(tabs)/perfil/settings/register/index.js
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { router } from 'expo-router';

import Container from '../../../../../components/Container';
import Input from '../../../../../components/Input';
import Select from '../../../../../components/Select';

import { COUNTRIES } from '../../../../../utils/countries';
import { updateUser, upsertUsersFromAPI } from '../../../../../store/slices/userSlice';
import { fetchMe } from '../../../../../store/slices/authSlice';
import { splitFullName, joinFullName } from '../../../../../features/users/profileComplition';
import { patchUserProfile } from '../../../../../services/usersService';

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

  const [form, setForm] = useState({
    fullName: '',
    userEmail: '',
    userRole: USER_ROLES[0],
    countryOfOrigin: '',
    reasonForTravel: '',
    dateOfBirth: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    });
  }, [user]);

  const validate = () => {
    const errs = [];
    if (!form.fullName.trim()) errs.push('Name is required');
    if (!form.userEmail.trim() || !/\S+@\S+\.\S+/.test(form.userEmail))
      errs.push('Valid email required');
    if (!form.countryOfOrigin) errs.push('Country is required');
    if (!form.reasonForTravel) errs.push('Reason for travel is required');
    setError(errs[0] || '');
    return errs.length === 0;
  };

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

  return (
    <Container>
      <ScrollView contentContainerStyle={{ gap: 16, paddingVertical: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Complete your profile</Text>

        {/* Full name */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Fullname</Text>
          <Input
            placeholder="Full name"
            value={form.fullName}
            onChangeText={(t) => setForm(f => ({ ...f, fullName: t }))}
          />
        </View>

        {/* Email */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Email</Text>
          <Input
            placeholder="Email"
            value={form.userEmail}
            onChangeText={(t) => setForm(f => ({ ...f, userEmail: t }))}
            keyboardType="email-address"
          />
        </View>

        {/* Date of birth → type="date" on web, Input on native */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: '600' }}>Date of birth</Text>
          {Platform.OS === 'web' ? (
            <View
              style={{
                display: 'flex',
                height: 34,
                paddingHorizontal: 16,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 50,
                backgroundColor: '#EDEDED',
                maxWidth: 333,
                width: '100%',
              }}
            >
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                }
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                }}
              />
            </View>
          ) : (
            <Input
              placeholder="YYYY-MM-DD"
              value={form.dateOfBirth}
              onChangeText={(t) =>
                setForm((f) => ({ ...f, dateOfBirth: t }))
              }
            />
          )}
        </View>

        {/* Role */}
        <Text style={{ fontWeight: '600' }}>Role</Text>
        <Select
          value={form.userRole}
          onChange={(v) => setForm(f => ({ ...f, userRole: v }))}
          options={USER_ROLES}
        />

        {/* Country */}
        <Text style={{ fontWeight: '600' }}>Country of origin</Text>
        <Select
          value={form.countryOfOrigin}
          onChange={(v) => setForm(f => ({ ...f, countryOfOrigin: v }))}
          options={COUNTRIES}
          placeholder="Select your country"
        />

        {/* Reason for travel */}
        <Text style={{ fontWeight: '600' }}>Reason for travel</Text>
        <Select
          value={form.reasonForTravel}
          onChange={(v) => setForm(f => ({ ...f, reasonForTravel: v }))}
          options={TRAVEL_REASONS}
          placeholder="Select reason"
        />

        {!!error && <Text style={{ color: '#c00' }}>{error}</Text>}

        <Pressable
          onPress={onSave}
          disabled={saving}
          style={{ backgroundColor: '#111', padding: 14, borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>
            {saving ? 'Saving…' : 'Save & Continue'}
          </Text>
        </Pressable>
      </ScrollView>
    </Container>
  );
}
