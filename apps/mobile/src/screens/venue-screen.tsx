import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import {
  PRICE_LABELS,
  REPORT_REASONS,
  VENUE_TYPE_LABELS,
  WEEKDAYS_FR,
  formatMinutes,
  isOpenNow,
  type EventItem,
  type ReviewsPage,
  type VenueDetail,
} from '@tn/contracts';
import { api, media } from '../api';
import { useAuth } from '../auth';
import { StarInput, Stars } from '../components/stars';
import type { VenueScreenProps } from '../navigation';
import { colors, formatRating, radius, space } from '../theme';

const { width } = Dimensions.get('window');
const eventDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Tunis',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

export function VenueScreen({ route, navigation }: VenueScreenProps) {
  const { slug } = route.params;
  const { user } = useAuth();
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [reviews, setReviews] = useState<ReviewsPage | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hasMine, setHasMine] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVenue = useCallback(() => {
    api
      .venue(slug)
      .then(setVenue)
      .catch((e: Error) => setError(e.message));
    api
      .reviews(slug)
      .then(setReviews)
      .catch(() => undefined);
  }, [slug]);

  useEffect(() => {
    loadVenue();
    api
      .events(slug)
      .then(setEvents)
      .catch(() => undefined);
  }, [slug, loadVenue]);

  useEffect(() => {
    if (!user) {
      setIsFav(false);
      setHasMine(false);
      return;
    }
    api
      .favorites()
      .then((f) => setIsFav(f.some((v) => v.slug === slug)))
      .catch(() => undefined);
    api
      .myReview(slug)
      .then((r) => {
        setHasMine(!!r);
        if (r) {
          setRating(r.rating);
          setComment(r.comment);
        }
      })
      .catch(() => undefined);
  }, [user, slug]);

  async function toggleFavorite() {
    if (!user) return navigation.navigate('Tabs', { screen: 'Compte' } as never);
    if (isFav) await api.removeFavorite(slug);
    else await api.addFavorite(slug);
    setIsFav(!isFav);
  }

  /** Signalement d'un avis : le motif est choisi dans une liste, envoyé aux modérateurs. */
  function reportReview(reviewId: string) {
    Alert.alert('Signaler cet avis', 'Pour quelle raison ?', [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await api.report({ targetType: 'REVIEW', targetId: reviewId, reason });
            Alert.alert('Merci', 'Un modérateur va examiner cet avis.');
          } catch (e) {
            Alert.alert('Signalement', (e as Error).message);
          }
        },
      })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }

  async function submit() {
    if (rating === 0) return setFeedback({ ok: false, text: 'Choisis une note de 1 à 5 étoiles.' });
    setSaving(true);
    try {
      await api.saveReview(slug, { rating, comment });
      setFeedback({
        ok: true,
        text: hasMine ? 'Ton avis a été modifié.' : 'Merci ! Ton avis est publié.',
      });
      setHasMine(true);
      loadVenue();
    } catch (e) {
      setFeedback({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (error) return <Text style={[styles.screen, styles.error]}>{error}</Text>;
  if (!venue)
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.violet} />
      </View>
    );

  const open = isOpenNow(venue.openingHours);
  const coord = { latitude: venue.latitude, longitude: venue.longitude };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: space(16) }}>
      {/* Galerie qui défile horizontalement */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {venue.photos.map((p) => (
          <Image
            key={p.storageKey}
            source={{ uri: media(p.storageKey)! }}
            style={{ width, height: width * 0.66 }}
            accessibilityLabel={p.altText}
          />
        ))}
      </ScrollView>

      <View style={styles.body}>
        <Text style={styles.kicker}>
          {VENUE_TYPE_LABELS[venue.type]} · {venue.city.name} · {PRICE_LABELS[venue.priceRange]}
        </Text>
        <Text style={styles.title}>{venue.name}</Text>

        <View style={styles.row}>
          {venue.rating.average !== null ? (
            <>
              <Stars value={venue.rating.average} size={18} />
              <Text style={styles.bold}>{formatRating(venue.rating.average)}</Text>
              <Text style={styles.muted}>({venue.rating.count} avis)</Text>
            </>
          ) : (
            <Text style={styles.muted}>Pas encore d’avis</Text>
          )}
          <Text style={[styles.badge, open ? styles.open : styles.closed]}>
            {open ? '● Ouvert' : 'Fermé'}
          </Text>
          {venue.isDemo && <Text style={[styles.badge, styles.demo]}>Démo</Text>}
        </View>

        <View style={[styles.row, { marginTop: space(4) }]}>
          <Pressable
            style={styles.primary}
            onPress={() =>
              Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`,
              )
            }
          >
            <Text style={styles.primaryText}>🧭 Itinéraire</Text>
          </Pressable>
          <Pressable style={[styles.secondary, isFav && styles.favActive]} onPress={toggleFavorite}>
            <Text style={{ color: isFav ? colors.pink : colors.ink, fontWeight: '700' }}>
              {isFav ? '♥ Favori' : '♡ Favori'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.description}>{venue.description}</Text>
        {venue.genres.length > 0 && (
          <View style={[styles.row, { marginTop: space(3) }]}>
            {venue.genres.map((g) => (
              <Text key={g.slug} style={styles.tag}>
                {g.name}
              </Text>
            ))}
          </View>
        )}

        {/* Carte */}
        <Text style={styles.h2}>Localisation</Text>
        <MapView
          style={styles.map}
          initialRegion={{ ...coord, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
          userInterfaceStyle="dark"
          scrollEnabled={false}
        >
          <Marker
            coordinate={coord}
            title={venue.name}
            description={venue.address}
            pinColor={colors.violet}
          />
        </MapView>
        <Text style={styles.muted}>{venue.address}</Text>

        {/* Horaires */}
        <Text style={styles.h2}>Horaires</Text>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const slots = venue.openingHours.filter((h) => h.weekday === d);
          return (
            <View key={d} style={styles.hours}>
              <Text style={styles.muted}>{WEEKDAYS_FR[d]}</Text>
              <Text style={styles.ink}>
                {slots.length
                  ? slots
                      .map((s) => `${formatMinutes(s.opensAt)} – ${formatMinutes(s.closesAt)}`)
                      .join(', ')
                  : 'Fermé'}
              </Text>
            </View>
          );
        })}

        {events.length > 0 && (
          <>
            <Text style={styles.h2}>Prochaines soirées</Text>
            {events.map((e) => (
              <View key={e.id} style={styles.card}>
                <Text style={styles.eventDate}>{eventDate(e.startsAt)}</Text>
                <Text style={styles.bold}>{e.title}</Text>
                <Text style={styles.muted}>{e.description}</Text>
              </View>
            ))}
          </>
        )}

        {/* Notation */}
        <Text style={styles.h2}>Ton avis</Text>
        <View style={[styles.card, { borderColor: colors.violet }]}>
          {user ? (
            <>
              <StarInput value={rating} onChange={setRating} />
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Ambiance, musique, accueil… (facultatif)"
                placeholderTextColor={colors.muted}
                multiline
                maxLength={1000}
                style={styles.input}
              />
              <Pressable
                style={[styles.primary, { alignSelf: 'flex-start' }]}
                onPress={submit}
                disabled={saving}
              >
                <Text style={styles.primaryText}>
                  {saving ? 'Envoi…' : hasMine ? 'Mettre à jour' : 'Publier'}
                </Text>
              </Pressable>
              {feedback && (
                <Text
                  style={{ color: feedback.ok ? colors.green : colors.pink, marginTop: space(2) }}
                >
                  {feedback.text}
                </Text>
              )}
            </>
          ) : (
            <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Compte' } as never)}>
              <Text style={styles.muted}>
                <Text style={{ color: colors.violetGlow, fontWeight: '700' }}>Connecte-toi</Text>{' '}
                pour noter cet établissement.
              </Text>
            </Pressable>
          )}
        </View>

        {/* Avis */}
        <Text style={styles.h2}>Avis des membres</Text>
        {reviews?.items.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={styles.bold}>
                {r.author.name}
                {r.isMine ? ' (toi)' : ''}
              </Text>
              <Stars value={r.rating} />
            </View>
            {!!r.comment && (
              <Text style={[styles.muted, { marginTop: space(2) }]}>{r.comment}</Text>
            )}
            {user && !r.isMine && (
              <Pressable onPress={() => reportReview(r.id)} hitSlop={8}>
                <Text style={[styles.muted, { marginTop: space(2), fontSize: 12 }]}>
                  🚩 Signaler
                </Text>
              </Pressable>
            )}
          </View>
        ))}
        {reviews && reviews.items.length === 0 && (
          <Text style={styles.muted}>Sois le premier à donner ton avis !</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  center: { alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.pink, padding: space(4) },
  body: { padding: space(4) },
  kicker: { color: colors.violetGlow, fontWeight: '600' },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', marginVertical: space(1) },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space(2) },
  bold: { color: colors.ink, fontWeight: '700' },
  ink: { color: colors.ink },
  muted: { color: colors.muted },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  open: { color: colors.green, backgroundColor: 'rgba(16,185,129,0.15)' },
  closed: { color: colors.muted, backgroundColor: colors.surface2 },
  demo: { color: colors.violetGlow, borderWidth: 1, borderColor: colors.violetGlow },
  primary: {
    backgroundColor: colors.violet,
    paddingHorizontal: space(5),
    paddingVertical: space(3),
    borderRadius: radius.md,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: {
    borderWidth: 1,
    borderColor: colors.surface2,
    paddingHorizontal: space(5),
    paddingVertical: space(3),
    borderRadius: radius.md,
  },
  favActive: { borderColor: colors.pink, backgroundColor: 'rgba(236,72,153,0.12)' },
  description: { color: colors.muted, marginTop: space(4), lineHeight: 21 },
  tag: {
    color: colors.ink,
    backgroundColor: colors.surface2,
    paddingHorizontal: space(3),
    paddingVertical: space(1),
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  h2: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    marginTop: space(8),
    marginBottom: space(3),
  },
  map: { height: 180, borderRadius: radius.lg, marginBottom: space(2) },
  hours: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface2,
    padding: space(4),
    marginBottom: space(3),
  },
  eventDate: {
    color: colors.violetGlow,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.night,
    color: colors.ink,
    borderRadius: radius.md,
    padding: space(3),
    minHeight: 80,
    marginVertical: space(3),
    textAlignVertical: 'top',
  },
});
