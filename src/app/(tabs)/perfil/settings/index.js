import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';

import AuthBackground from '../../../../components/auth/AuthBackground';
import AuthCard from '../../../../components/auth/AuthCard';
import { useMedia } from '../../../../hooks/useMedia';

export default function SettingsScreen() {
  const { isMobile } = useMedia();

  return (
    <AuthBackground>
      <View style={styles.container}>
        <AuthCard style={styles.card}>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Ajustes</Text>
          </View>

          <View style={[styles.buttonRow, isMobile && styles.buttonRowMobile]}>
            <Pressable
              onPress={() => router.push('/(tabs)/perfil/settings/register')}
              style={[styles.primaryButton, isMobile && styles.buttonMobile]}
            >
              <Text style={[styles.primaryButtonText, isMobile && styles.buttonTextMobile]}>
                Ajustes de perfil
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/perfil')}
              style={[styles.outlineButton, isMobile && styles.buttonMobile]}
            >
              <Text style={[styles.outlineButtonText, isMobile && styles.buttonTextMobile]}>
                Regresar
              </Text>
            </Pressable>
          </View>
        </AuthCard>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 52,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  card: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 640 : undefined,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 34,
    flex: 1,
  },
  headerBlock: {
    width: '100%',
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1B2222',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 18,
    alignItems: 'center',
  },
  buttonRowMobile: {
    gap: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 80,
    width: 200,
    backgroundColor: '#259D4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FDFDFC',
  },
  outlineButton: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 80,
    width: 200,
    backgroundColor: '#FDFDFC',
    borderWidth: 2,
    borderColor: '#383A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#383A3A',
  },
  buttonMobile: {
    flex: 1,
    width: undefined,
    paddingVertical: 11,
  },
  buttonTextMobile: {
    fontSize: 13,
  },
});
