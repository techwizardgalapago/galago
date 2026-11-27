import { Modal, View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { AVATARES } from '../../features/users/avatares';
import { useMedia } from '../../hooks/useMedia';

// El selector de gosito. Se abre tocando el circulo del perfil.
//
// Elegir guarda y cierra de una vez: no hay boton de confirmar porque no hay
// nada que confirmar, el avatar se ve al instante y volver a abrir el selector
// lo cambia otra vez. Un paso mas solo seria un paso mas.
export default function AvatarPicker({ visible, avatarClave, onSelect, onClose }) {
  const { isMobile, isTablet, isDesktop, isWide } = useMedia();

  let maxWidth;
  if (isTablet) maxWidth = 520;
  if (isDesktop) maxWidth = 640;
  if (isWide) maxWidth = 720;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        <View
          style={[
            styles.sheet,
            !isMobile && maxWidth
              ? { maxWidth, alignSelf: 'center', width: '100%' }
              : null,
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Elegí tu gosito</Text>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {AVATARES.map((avatar) => {
              const elegido = avatar.clave === avatarClave;
              return (
                <Pressable
                  key={avatar.clave}
                  onPress={() => onSelect(avatar.clave)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: elegido }}
                  accessibilityLabel={avatar.nombre}
                  style={styles.opcion}
                >
                  <View style={[styles.circulo, elegido ? styles.circuloElegido : null]}>
                    <Image
                      source={avatar.imagen}
                      style={styles.gosito}
                      resizeMode="contain"
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    />
                  </View>
                  <Text style={[styles.nombre, elegido ? styles.nombreElegido : null]}>
                    {avatar.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
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
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 22,
    // Con diez gositos la hoja no puede crecer hasta tapar la pantalla: se
    // queda en tres cuartos y la rejilla hace scroll dentro.
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B2222',
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#1B2222',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 6,
  },
  opcion: {
    width: 92,
    alignItems: 'center',
    gap: 6,
  },
  circulo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#9FD4F2',
    borderWidth: 2,
    borderColor: '#1B2222',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circuloElegido: {
    borderWidth: 4,
    borderColor: '#C43D3D',
  },
  gosito: {
    width: '86%',
    height: '86%',
  },
  nombre: {
    fontSize: 12,
    color: '#1B2222',
    textAlign: 'center',
  },
  nombreElegido: {
    fontWeight: '600',
  },
});
