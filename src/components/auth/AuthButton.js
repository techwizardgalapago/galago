import { Pressable, Text, StyleSheet } from 'react-native';

export default function AuthButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}) {
  const isOutline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        isOutline ? styles.outline : styles.primary,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.textBase,
          isOutline ? styles.textOutline : styles.textPrimary,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#383A3A',
  },
  outline: {
    backgroundColor: '#FDFDFC',
    borderWidth: 2,
    borderColor: '#383A3A',
  },
  textBase: {
    fontSize: 14,
    fontWeight: '600',
  },
  textPrimary: {
    color: '#FDFDFC',
  },
  textOutline: {
    color: '#383A3A',
  },
  disabled: {
    opacity: 0.6,
  },
});
