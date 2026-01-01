import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function ProfileTabs({ tabs, activeKey, onChange }) {
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange?.(tab.key)}
            style={styles.tab}
          >
            <Text style={[styles.label, isActive ? styles.active : styles.inactive]}>
              {tab.label}
            </Text>
            {isActive ? <View style={styles.dot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 45,
    width: '100%',
  },
  tab: {
    alignItems: 'center',
    gap: 2,
    minWidth: 80,
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
