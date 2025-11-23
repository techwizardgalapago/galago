// src/components/Select.js
import React from 'react';
import { Platform, View, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import ArrowIcon from '../../assets/icons/select-arrow.png'; // or your icon

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  style,
}) {
  const base = {
    width: '100%',
    maxWidth: 333,
    height: 34,
    backgroundColor: '#EDEDED',
    borderRadius: 50,
    paddingLeft: 12,
    paddingRight: 29,
    justifyContent: 'center',
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[base, { position: 'relative' }, style]}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            fontSize: 14,
            paddingRight: 20,
            cursor: 'pointer',
          }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) =>
            typeof opt === 'string' ? (
              <option key={opt} value={opt}>{opt}</option>
            ) : (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            )
          )}
        </select>

        <Image
          source={ArrowIcon}
          style={{
            width: 12,
            height: 12,
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: [{ translateY: -6 }],
            pointerEvents: 'none',
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // native
  return (
    <View style={[base, style]}>
      <Picker
        selectedValue={value}
        onValueChange={onChange}
        style={{ width: '100%', height: '100%' }}
      >
        {placeholder && <Picker.Item label={placeholder} value="" />}
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <Picker.Item key={opt} label={opt} value={opt} />
          ) : (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          )
        )}
      </Picker>
    </View>
  );
}
