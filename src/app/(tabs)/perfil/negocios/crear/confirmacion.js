import { View, Text, Image, Pressable, StyleSheet, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AuthBackground from '../../../../../components/auth/AuthBackground';

const MASCOT = require('../../../../../../assets/mascot-gosurf.png');
const WHATSAPP_NUMBER = 'PLACEHOLDER'; // reemplazar con el número real (sin +)

export default function CrearNegocioConfirmacion() {
  // El negocio se crea aunque fallen las fotos. Cuando eso pasa llega aqui el
  // motivo por parametro, para no dejar a la persona creyendo que subio todo.
  const { errorFotos } = useLocalSearchParams();
  const handleContinuar = () => {
    router.replace('/(tabs)/perfil');
  };

  const handleWhatsApp = () => {
    Linking.openURL(`whatsapp://send?phone=${WHATSAPP_NUMBER}`).catch(() =>
      Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`)
    );
  };

  return (
    <AuthBackground>
      <View style={styles.container}>
        <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />

        <View style={styles.card}>
          <Text style={styles.title}>Gracias por registrar tu negocio!</Text>
          <Text style={styles.subtitle}>
            Nuestro equipo lo revisará y subirá a la plataforma en max. 48 horas
          </Text>

          {errorFotos ? (
            <View style={styles.aviso}>
              <Text style={styles.avisoTitulo}>Las fotos no se subieron</Text>
              <Text style={styles.avisoTexto}>{errorFotos}</Text>
              <Text style={styles.avisoTexto}>
                El negocio sí quedó guardado. Puedes añadir las fotos desde Mis
                negocios → Editar.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.outlineBtn} onPress={handleContinuar}>
            <Text style={styles.outlineBtnText}>Continuar</Text>
          </Pressable>

          <Pressable style={styles.whatsappBtn} onPress={handleWhatsApp}>
            <Text style={styles.whatsappBtnText}>Contactar a GalapaGO</Text>
          </Pressable>
        </View>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 24,
  },
  mascot: {
    width: 156,
    height: 155,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 364,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1b2222',
    textAlign: 'center',
    lineHeight: 28,
  },
  aviso: {
    backgroundColor: '#FFF4F6',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    width: '100%',
  },
  avisoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b2222',
  },
  avisoTexto: {
    fontSize: 13,
    color: '#5a6060',
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#99a0a0',
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    maxWidth: 303,
    gap: 16,
  },
  outlineBtn: {
    borderWidth: 2,
    borderColor: '#383a3a',
    borderRadius: 80,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#fdfdfc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#383a3a',
  },
  whatsappBtn: {
    backgroundColor: '#259d4e',
    borderRadius: 80,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
  whatsappBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fdfdfc',
  },
});
