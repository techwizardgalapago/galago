import { View, Image, StyleSheet } from 'react-native';

export default function ProfileAvatarBadge({
  avatarUri,
  badgeUri,
  size = 80,
  badgeSize = 68,
  style,
}) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.image} />
      ) : null}
      {badgeUri ? (
        <Image
          source={{ uri: badgeUri }}
          style={[
            styles.badge,
            { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#9FD4F2',
    borderWidth: 2,
    borderColor: '#1B2222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  badge: {
    position: 'absolute',
    transform: [{ rotate: '5deg' }],
  },
});
