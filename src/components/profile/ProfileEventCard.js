import { View, Text, StyleSheet } from 'react-native';

export default function ProfileEventCard({ time, title, location, tags }) {
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
        {tags?.length ? (
          <View style={styles.tags}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
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
    gap: 10,
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
  tags: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(230,83,0,0.1)',
    paddingHorizontal: 12,
    borderRadius: 15,
    height: 26,
    justifyContent: 'center',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E65300',
  },
});
