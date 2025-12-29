import { Pressable, Text, StyleSheet, View } from 'react-native';

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
    return <View style={style}>{content}</View>;
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
