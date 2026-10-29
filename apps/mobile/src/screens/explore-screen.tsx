import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VENUE_TYPES, VENUE_TYPE_LABELS, type EventItem, type VenueSummary } from '@tn/contracts';
import { api, media } from '../api';
import { useAuth } from '../auth';
import { VenueCard } from '../components/venue-card';
import type { RootStackParamList } from '../navigation';
import { colors, radius, space } from '../theme';

type Option = { value: string | undefined; label: string };
const SORTS: Option[] = [
  { value: 'rating', label: 'Mieux notés' },
  { value: 'name', label: 'A → Z' },
  { value: 'newest', label: 'Nouveautés' },
];

const eventDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Tunis',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

/** Rangée de pastilles défilantes (un seul choix actif). */
function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <View style={{ marginTop: space(3) }}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <Pressable
              key={o.value ?? 'all'}
              onPress={() => onChange(o.value)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && { color: '#fff' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ExploreScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [venues, setVenues] = useState<VenueSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [genres, setGenres] = useState<Option[]>([]);
  const [city, setCity] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [genre, setGenre] = useState<string | undefined>();
  const [sort, setSort] = useState<string | undefined>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.venues({ city, type, genre, sort, q: q.trim() || undefined });
      setVenues(res.items);
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [city, type, genre, sort, q]);

  useEffect(() => {
    api
      .filters()
      .then((f) => {
        setCities(f.cities.map((c) => ({ value: c.slug, label: c.name })));
        setGenres(f.genres.map((g) => ({ value: g.slug, label: g.name })));
      })
      .catch(() => undefined);
    api
      .events(undefined, 6)
      .then(setEvents)
      .catch(() => undefined);
  }, []);

  // Recherche relancée 300 ms après la dernière modification
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const activeFilters = [type, genre].filter(Boolean).length + (sort !== 'rating' ? 1 : 0);
  const openVenue = (v: { slug: string; name: string }) =>
    nav.navigate('Venue', { slug: v.slug, name: v.name });

  const header = (
    <View>
      {/* Barre du haut : nom de la plateforme */}
      <View style={styles.topBar}>
        <Text style={styles.brand}>
          Tunis<Text style={{ color: colors.violetGlow }}>Nightlife</Text>
        </Text>
        <Pressable
          onPress={() => nav.navigate('Tabs', { screen: 'Compte' } as never)}
          style={styles.account}
          accessibilityLabel="Mon compte"
        >
          <Text style={styles.accountText}>
            {user ? (user.role === 'USER' ? user.name[0] : '⚙︎') : 'Connexion'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.kicker}>GRAND TUNIS</Text>
      <Text style={styles.title}>
        Les meilleures sorties,{' '}
        <Text style={{ color: colors.violetGlow }}>notées pour de vrai</Text>
      </Text>
      <Text style={styles.subtitle}>
        Boîtes de nuit, lounges et rooftops : notes des membres, carte, horaires et événements.
      </Text>

      <Pressable
        onPress={() => nav.navigate('Tabs', { screen: 'Carte' } as never)}
        style={styles.cta}
      >
        <Text style={styles.ctaText}>📍 Trouver autour de moi</Text>
      </Pressable>

      {/* Recherche et filtres */}
      <View style={styles.searchRow}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher un établissement…"
          placeholderTextColor={colors.muted}
          style={styles.search}
          returnKeyType="search"
          autoCorrect={false}
        />
        <Pressable
          onPress={() => setShowFilters((s) => !s)}
          style={[styles.filterBtn, (showFilters || activeFilters > 0) && styles.chipActive]}
          accessibilityLabel="Filtres"
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            ⚙︎{activeFilters > 0 ? ` ${activeFilters}` : ''}
          </Text>
        </Pressable>
      </View>

      <Chips
        label="Ville"
        options={[{ value: undefined, label: 'Toutes' }, ...cities]}
        value={city}
        onChange={setCity}
      />
      {showFilters && (
        <>
          <Chips
            label="Type"
            options={[
              { value: undefined, label: 'Tous' },
              ...VENUE_TYPES.map((t) => ({ value: t, label: VENUE_TYPE_LABELS[t] })),
            ]}
            value={type}
            onChange={setType}
          />
          <Chips
            label="Musique"
            options={[{ value: undefined, label: 'Toutes' }, ...genres]}
            value={genre}
            onChange={setGenre}
          />
          <Chips label="Trier" options={SORTS} value={sort} onChange={setSort} />
          {activeFilters > 0 && (
            <Pressable
              onPress={() => {
                setType(undefined);
                setGenre(undefined);
                setSort('rating');
              }}
            >
              <Text style={styles.reset}>Réinitialiser les filtres</Text>
            </Pressable>
          )}
        </>
      )}

      {/* Soirées à venir */}
      {events.length > 0 && (
        <View style={{ marginTop: space(6) }}>
          <Text style={styles.h2}>Soirées à venir</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {events.map((e) => (
              <Pressable
                key={e.id}
                style={styles.event}
                onPress={() => openVenue({ slug: e.venue.slug, name: e.venue.name })}
              >
                {media(e.venue.coverPhotoKey) && (
                  <Image source={{ uri: media(e.venue.coverPhotoKey)! }} style={styles.eventImg} />
                )}
                <View style={{ padding: space(3) }}>
                  <Text style={styles.eventDate}>{eventDate(e.startsAt)}</Text>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {e.title}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {e.venue.name} · {e.venue.city}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={[styles.h2, { marginTop: space(6) }]}>
        {venues ? `${total} établissement${total > 1 ? 's' : ''}` : 'Établissements'}
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {!error && venues === null && (
        <ActivityIndicator color={colors.violet} style={{ marginTop: space(8) }} />
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.screen}
      // Marge haute = zone de l'encoche / barre d'état
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space(2) }]}
      data={venues ?? []}
      keyExtractor={(v) => v.id}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.violet}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={{ height: space(3) }} />}
      renderItem={({ item }) => <VenueCard venue={item} onPress={() => openVenue(item)} />}
      ListEmptyComponent={
        venues && venues.length === 0 ? (
          <Text style={styles.muted}>Aucun résultat avec ces filtres.</Text>
        ) : undefined
      }
      ListFooterComponent={
        <Text style={styles.footnote}>
          Les établissements « Démo » sont fictifs et servent uniquement à la démonstration.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  content: { paddingHorizontal: space(4), paddingBottom: space(10) },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: space(3),
    marginBottom: space(5),
    borderBottomWidth: 1,
    borderBottomColor: colors.surface2,
  },
  brand: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  account: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: space(3),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: { color: colors.violetGlow, fontWeight: '700' },
  kicker: { color: colors.violetGlow, fontSize: 12, letterSpacing: 2, fontWeight: '700' },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
    marginTop: space(1),
    lineHeight: 36,
  },
  subtitle: { color: colors.muted, marginTop: space(2), lineHeight: 20 },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.violet,
    paddingHorizontal: space(5),
    paddingVertical: space(3),
    borderRadius: radius.full,
    marginTop: space(5),
    shadowColor: colors.violet,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  searchRow: { flexDirection: 'row', gap: space(2), marginTop: space(6) },
  search: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.ink,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface2,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    fontSize: 16,
  },
  filterBtn: {
    width: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterLabel: { color: colors.muted, fontSize: 12, marginBottom: space(1.5) },
  chip: {
    paddingHorizontal: space(4),
    paddingVertical: space(2),
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    marginRight: space(2),
    borderWidth: 1,
    borderColor: colors.surface2,
  },
  chipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  chipText: { color: colors.muted, fontWeight: '600' },
  reset: { color: colors.violetGlow, marginTop: space(3), fontWeight: '600' },
  h2: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: space(3) },
  event: {
    width: 230,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface2,
    marginRight: space(3),
    overflow: 'hidden',
  },
  eventImg: { width: '100%', height: 100 },
  eventDate: {
    color: colors.violetGlow,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventTitle: { color: colors.ink, fontWeight: '700', marginTop: 2 },
  error: { color: colors.pink, marginBottom: space(4) },
  muted: { color: colors.muted },
  footnote: { color: colors.muted, fontSize: 12, marginTop: space(6) },
});
