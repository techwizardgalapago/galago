import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function PerfilScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Perfil</Text>

      <Pressable
        onPress={() => router.push('/(tabs)/perfil/settings')}
        style={{ padding: 12, backgroundColor: '#111', borderRadius: 12 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
          Settings
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(tabs)/perfil/negocios')}
        style={{ padding: 12, backgroundColor: '#0a6', borderRadius: 12 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>
          Mis negocios
        </Text>
      </Pressable>
    </View>
  );
}
