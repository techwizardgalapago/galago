import { TextInput, StyleSheet } from 'react-native';

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
    width: '100%',
    height: 34,
    backgroundColor: '#EDEDED',
    borderRadius: 50,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1B2222',
  },
});
