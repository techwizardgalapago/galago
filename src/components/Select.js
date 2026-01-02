// src/components/Select.js
import React, { useState } from 'react';
import {
  Platform,
  View,
  Image,
  Pressable,
  Text,
  ActionSheetIOS,
  Modal,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import ArrowIcon from '../../assets/icons/select-arrow.png'; // or your icon

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  style,
}) {
  const [androidOpen, setAndroidOpen] = useState(false);
  const normalized = options.map((opt) =>
    typeof opt === 'string'
      ? { label: opt, value: opt }
      : { label: opt.label, value: opt.value }
  );
  const currentLabel =
    normalized.find((opt) => opt.value === value)?.label || placeholder;
  const base = {
    width: '100%',
    maxWidth: 333,
    height: Platform.OS === 'android' ? 40 : 34,
    backgroundColor: '#EDEDED',
    borderRadius: 50,
    paddingLeft: 12,
    paddingRight: 29,
    justifyContent: 'center',
  };

  if (Platform.OS === 'ios') {
    const onPress = () => {
      const labels = normalized.map((opt) => opt.label);
      const cancelIndex = placeholder ? labels.length : labels.length;
      const optionsList = placeholder
        ? [...labels, 'Cancelar']
        : [...labels, 'Cancelar'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: optionsList,
          cancelButtonIndex: cancelIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === cancelIndex) return;
          const selected = normalized[buttonIndex];
          if (selected) onChange(selected.value);
        }
      );
    };

    return (
      <Pressable onPress={onPress} style={[base, style]}>
        <Text
          style={{
            fontSize: 14,
            color: value ? '#1B2222' : '#99A0A0',
          }}
          numberOfLines={1}
        >
          {currentLabel}
        </Text>
        <Image
          source={ArrowIcon}
          style={{
            width: 12,
            height: 12,
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: [{ translateY: -6 }],
          }}
          resizeMode="contain"
        />
      </Pressable>
    );
  }

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
          {normalized.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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

  // android: custom modal selector to avoid clipped text
  return (
    <>
      <Pressable onPress={() => setAndroidOpen(true)} style={[base, style]}>
        <Text
          style={{
            fontSize: 14,
            color: value ? '#1B2222' : '#99A0A0',
          }}
          numberOfLines={1}
        >
          {currentLabel}
        </Text>
        <Image
          source={ArrowIcon}
          style={{
            width: 12,
            height: 12,
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: [{ translateY: -6 }],
          }}
          resizeMode="contain"
        />
      </Pressable>
      <Modal
        transparent
        visible={androidOpen}
        animationType="fade"
        onRequestClose={() => setAndroidOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'flex-end',
          }}
          onPress={() => setAndroidOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingVertical: 8,
              maxHeight: '60%',
            }}
            onPress={() => {}}
          >
            <FlatList
              data={normalized}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onChange(item.value);
                    setAndroidOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                  }}
                >
                  <Text style={{ fontSize: 16, color: '#1B2222' }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: '#eee' }} />
              )}
            />
            <TouchableOpacity
              onPress={() => setAndroidOpen(false)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 14,
              }}
            >
              <Text style={{ fontSize: 16, color: '#99A0A0' }}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
