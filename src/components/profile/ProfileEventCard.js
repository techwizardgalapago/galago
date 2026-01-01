import { View, Text, StyleSheet } from 'react-native';

export default function ProfileEventCard({ time, title, location }) {
  return (
    <View style={styles.row}>
      <View style={styles.accent} />
      <View style={styles.card}>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {location}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    width: '100%',
    gap: 16,
  },
  accent: {
    width: 5,
    height: 70,
    borderRadius: 30,
    backgroundColor: '#F26719',
  },
  card: {
    flex: 1,
    paddingVertical: 20,
    gap: 6,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E65300',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C3E3E',
  },
  location: {
    fontSize: 16,
    fontWeight: '300',
    color: '#99A0A0',
  },
});
