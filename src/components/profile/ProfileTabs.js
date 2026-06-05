import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { useMedia } from '../../hooks/useMedia';

export default function ProfileTabs({ tabs, activeKey, onChange }) {
  const { isMobile } = useMedia();
  const Container = isMobile ? ScrollView : View;
  const containerProps = isMobile
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: styles.rowMobile }
    : { style: styles.row };

  return (
    <Container {...containerProps}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange?.(tab.key)}
            style={isMobile ? styles.tabMobile : styles.tab}
          >
            <Text style={[styles.label, isActive ? styles.active : styles.inactive]}>
              {tab.label}
            </Text>
            {isActive ? <View style={styles.dot} /> : null}
          </Pressable>
        );
      })}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'ios' ? 24 : 45,
    width: '100%',
  },
  rowMobile: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 28,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
    paddingHorizontal: 6,
  },
  tabMobile: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  active: {
    color: '#383A3A',
  },
  inactive: {
    color: 'rgba(31, 34, 29, 0.4)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#383A3A',
  },
});
