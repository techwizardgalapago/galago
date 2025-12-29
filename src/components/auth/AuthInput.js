import { TextInput, StyleSheet, Platform } from 'react-native';

export default function AuthInput({
  style,
  placeholderTextColor = '#99A0A0',
  ...props
}) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={placeholderTextColor}
      style={[styles.input, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: Platform.OS === 'web' ? 303 : '100%',
    height: 40,
    backgroundColor: '#EDEDED',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 8 : 6,
    fontSize: 14,
    lineHeight: 18,
    color: '#1B2222',
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
    textAlignVertical: 'center',
  },
});
