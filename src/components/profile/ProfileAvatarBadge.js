import { View, Image, Pressable, StyleSheet } from 'react-native';
import CachedImage from "../CachedImage";
import { avatarPorClave } from "../../features/users/avatares";

// El circulo del perfil. Dentro va el gosito elegido; si algun dia hay foto de
// verdad, `avatarUri` la pinta encima y el gosito pasa a ser el respaldo.
export default function ProfileAvatarBadge({
  avatarUri,
  avatarClave,
  badgeUri,
  size = 80,
  badgeSize = 68,
  onPress,
  style,
}) {
  const avatar = avatarPorClave(avatarClave);
  const Envoltorio = onPress ? Pressable : View;

  return (
    <Envoltorio
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={
        onPress ? `Avatar ${avatar.nombre}. Tocá para cambiarlo` : avatar.nombre
      }
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {avatarUri ? (
        <CachedImage source={{ uri: avatarUri }} style={styles.image} />
      ) : (
        <Image
          source={avatar.imagen}
          style={styles.gosito}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
      {badgeUri ? (
        <CachedImage
          source={{ uri: badgeUri }}
          style={[
            styles.badge,
            { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
          ]}
        />
      ) : null}
    </Envoltorio>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#9FD4F2',
    borderWidth: 2,
    borderColor: '#1B2222',
    alignItems: 'center',
    justifyContent: 'center',
    // Los gositos son mas anchos que altos: sin esto, el dibujo se sale del
    // circulo por los lados y se ve el recorte contra el borde.
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  gosito: {
    // Un poco mas estrecho que el circulo para que el dibujo no toque el borde.
    width: '86%',
    height: '86%',
  },
  badge: {
    position: 'absolute',
    transform: [{ rotate: '5deg' }],
  },
});
