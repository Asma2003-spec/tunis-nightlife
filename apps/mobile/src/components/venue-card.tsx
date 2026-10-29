import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PRICE_LABELS, VENUE_TYPE_LABELS, type VenueSummary } from '@tn/contracts';
import { media } from '../api';
import { colors, formatKm, formatRating, radius, space } from '../theme';
import { Stars } from './stars';

export function VenueCard({ venue, onPress }: { venue: VenueSummary; onPress: () => void }) {
  const cover = media(venue.coverPhotoKey);
  const { average, count } = venue.rating;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={`${venue.name}, ${venue.city.name}`}
    >
      <View>
        {cover && <Image source={{ uri: cover }} style={styles.image} resizeMode="cover" />}
        {venue.isDemo && <Text style={[styles.pill, styles.demo]}>Démo</Text>}
        {venue.distanceKm !== undefined && (
          <Text style={[styles.pill, styles.distance]}>{formatKm(venue.distanceKm)}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{venue.name}</Text>
        <Text style={styles.muted}>
          {VENUE_TYPE_LABELS[venue.type]} · {venue.city.name} · {PRICE_LABELS[venue.priceRange]}
        </Text>
        <View style={styles.rating}>
          {average === null ? (
            <Text style={styles.muted}>Pas encore d’avis</Text>
          ) : (
            <>
              <Stars value={average} />
              <Text style={styles.ratingText}>{formatRating(average)}</Text>
              <Text style={styles.muted}>({count} avis)</Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface2,
    overflow: 'hidden',
  },
  image: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surface2 },
  pill: {
    position: 'absolute',
    top: space(3),
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  demo: { right: space(3), color: colors.violetGlow, backgroundColor: 'rgba(11,11,16,0.75)' },
  distance: { left: space(3), color: '#fff', backgroundColor: colors.violet },
  body: { padding: space(4) },
  name: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  muted: { color: colors.muted, marginTop: 2 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space(2) },
  ratingText: { color: colors.ink, fontWeight: '700' },
});
