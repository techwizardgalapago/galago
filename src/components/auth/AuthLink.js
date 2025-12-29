import { Pressable, Text, StyleSheet } from 'react-native';

export default function AuthLink({
  label,
  onPress,
  style,
  textStyle,
}) {
  const content = (
    <Text style={[styles.text, textStyle]}>
      {label}
    </Text>
  );

  if (!onPress) {
    return <Text style={[styles.text, textStyle]}>{label}</Text>;
  }

  return (
    <Pressable onPress={onPress} style={style}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#99A0A0',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
