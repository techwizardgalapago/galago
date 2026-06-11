import { View, Text, StyleSheet, Image } from 'react-native';

// priceLevel: número 1-4 → renderiza $$$$ con activos en naranja e inactivos en naranja al 50%
function PriceTag({ level }) {
  const total = 4;
  const active = Math.min(Math.max(Math.round(level), 1), total);
  return (
    <View style={styles.tag}>
      <Text style={styles.priceText}>
        {'$'.repeat(active)}
        <Text style={styles.priceInactive}>{'$'.repeat(total - active)}</Text>
      </Text>
    </View>
  );
}

export default function PlaceCard({
  imageUri,
  title,
  location,
  rating,
  category,
  price,
  priceLevel,
}) {
  const hasTags = rating || category || price || priceLevel;
  return (
    <View style={styles.row}>
      <View style={styles.thumbnail}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.location}>{location}</Text>
        </View>
        {hasTags ? (
          <View style={styles.tags}>
            {rating ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>★ {rating}</Text>
              </View>
            ) : null}
            {category ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{category}</Text>
              </View>
            ) : null}
            {priceLevel ? (
              <PriceTag level={priceLevel} />
            ) : price ? (
              <View style={styles.tag}>
                <Text style={styles.priceText}>{price}</Text>
              </View>
            ) : null}
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
    gap: 18,
    width: '100%',
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EDEDED',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    gap: 12,
  },
  textBlock: {
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C3E3E',
  },
  location: {
    fontSize: 14,
    fontWeight: '300',
    color: '#99A0A0',
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tag: {
    backgroundColor: 'rgba(230,83,0,0.1)',
    paddingHorizontal: 8,
    borderRadius: 15,
    justifyContent: 'center',
    height: 26,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E65300',
  },
  priceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E65300',
  },
  priceInactive: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(230,83,0,0.5)',
  },
});
