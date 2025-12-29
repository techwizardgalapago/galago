import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AuthBackground({ children, style }) {
  return (
    <LinearGradient
      colors={['#91CFFC', '#BAE5E5', '#E2FBCE', '#A3FAB6', '#91CFFC']}
      start={{ x: 0.05, y: 0.15 }}
      end={{ x: 0.85, y: 0.95 }}
      style={[styles.background, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#BAE5E5',
  },
});
