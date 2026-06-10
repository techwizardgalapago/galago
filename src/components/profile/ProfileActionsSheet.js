import { Modal, View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useMedia } from '../../hooks/useMedia';

const WHATSAPP_NUMBER = 'PLACEHOLDER'; // reemplazar con el número real (sin +)
const INSTAGRAM_HANDLE = 'PLACEHOLDER'; // reemplazar con el handle real

export default function ProfileActionsSheet({ visible, onClose }) {
  const { doLogout } = useAuth();
  const { isMobile, isTablet, isDesktop, isWide } = useMedia();

  let maxWidth;
  if (isTablet) maxWidth = 520;
  if (isDesktop) maxWidth = 640;
  if (isWide) maxWidth = 720;

  const handleWhatsApp = () => {
    Linking.openURL(`whatsapp://send?phone=${WHATSAPP_NUMBER}`).catch(() =>
      Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`)
    );
  };

  const handleInstagram = () => {
    Linking.openURL(`instagram://user?username=${INSTAGRAM_HANDLE}`).catch(() =>
      Linking.openURL(`https://instagram.com/${INSTAGRAM_HANDLE}`)
    );
  };

  const handleLogout = async () => {
    onClose();
    try {
      await doLogout();
      router.replace('/(auth)/login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const handleSettings = () => {
    onClose();
    router.push('/(tabs)/perfil/settings/register');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[
          styles.sheet,
          !isMobile && maxWidth ? { maxWidth, alignSelf: 'center', width: '100%' } : null,
        ]}>
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <View style={styles.buttons}>
          <Pressable style={[styles.btn, { backgroundColor: '#259d4e' }]} onPress={handleWhatsApp}>
            <Text style={styles.btnText}>Contáctanos</Text>
          </Pressable>

          <Pressable style={[styles.btn, { backgroundColor: '#e1306c' }]} onPress={handleInstagram}>
            <Text style={styles.btnText}>Instagram</Text>
          </Pressable>

          <Pressable style={[styles.btn, { backgroundColor: '#fd1d1d' }]} onPress={handleLogout}>
            <Text style={styles.btnText}>Cerrar sesión</Text>
          </Pressable>

          <Pressable style={[styles.btn, { backgroundColor: '#979797' }]} onPress={handleSettings}>
            <Text style={styles.btnText}>Ajustes del perfil</Text>
          </Pressable>
        </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fdfdfc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 22,
    paddingBottom: 34,
    paddingHorizontal: 22,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#1B2222',
  },
  buttons: {
    gap: 16,
  },
  btn: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
    fontWeight: '500',
    color: '#fdfdfc',
    letterSpacing: -0.32,
  },
});
