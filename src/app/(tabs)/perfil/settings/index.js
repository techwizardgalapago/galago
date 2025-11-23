import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

import Container from '../../../../components/Container';

export default function SettingsScreen() {
  return (
    <Container>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '700' }}>Settings</Text>

        <Pressable
          onPress={() => router.push('/(tabs)/perfil/settings/register')}
          style={{ padding: 12, backgroundColor: '#111', borderRadius: 12 }}
        >
          <Text
            style={{
              color: 'white',
              textAlign: 'center',
              fontWeight: '700',
            }}
          >
            Complete su perfil
          </Text>
        </Pressable>
      </View>
    </Container>
  );
}
