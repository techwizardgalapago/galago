import { Text, StyleSheet } from 'react-native';

export default function AuthTitle({ children, style }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1B2222',
    textAlign: 'center',
  },
});
