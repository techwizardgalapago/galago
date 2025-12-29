import { View, StyleSheet } from 'react-native';
import { useMedia } from '../../hooks/useMedia';

export default function AuthCard({ children, style }) {
  const { isMobile, isTablet, isDesktop, isWide } = useMedia();

  let maxWidth;
  if (isTablet) maxWidth = 520;
  if (isDesktop) maxWidth = 640;
  if (isWide) maxWidth = 720;

  return (
    <View
      style={[
        styles.card,
        !isMobile && maxWidth ? { maxWidth } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FDFDFC',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
});
