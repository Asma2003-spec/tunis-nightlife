import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { STATUS_LABELS, type Paginated } from '@tn/contracts';
import { colors, radius, space } from '../theme';

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  PUBLISHED: { fg: colors.green, bg: 'rgba(16,185,129,0.15)' },
  RESOLVED: { fg: colors.green, bg: 'rgba(16,185,129,0.15)' },
  PENDING: { fg: '#FCD34D', bg: 'rgba(245,158,11,0.15)' },
  OPEN: { fg: '#FCD34D', bg: 'rgba(245,158,11,0.15)' },
  SUSPENDED: { fg: colors.pink, bg: 'rgba(236,72,153,0.15)' },
  REJECTED: { fg: colors.pink, bg: 'rgba(236,72,153,0.15)' },
  CANCELLED: { fg: colors.pink, bg: 'rgba(236,72,153,0.15)' },
};

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { fg: colors.muted, bg: colors.surface2 };
  return (
    <Text style={[ui.badge, { color: c.fg, backgroundColor: c.bg }]}>
      {STATUS_LABELS[status] ?? status}
    </Text>
  );
}

export function ActionButton({
  label,
  onPress,
  tone = 'ghost',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'ghost' | 'danger' | 'primary';
  disabled?: boolean;
}) {
  const style = tone === 'primary' ? ui.btnPrimary : tone === 'danger' ? ui.btnDanger : ui.btnGhost;
  const text = tone === 'primary' ? '#fff' : tone === 'danger' ? colors.pink : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [ui.btn, style, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Text style={{ color: text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Liste paginée générique du back-office : filtre par statut, recherche facultative,
 * tirer pour actualiser et chargement de la page suivante en bas de liste.
 */
export function AdminList<T extends { id: string }>({
  fetcher,
  statuses,
  initialStatus = '',
  searchPlaceholder,
  renderItem,
  empty = 'Rien à afficher.',
}: {
  fetcher: (p: { page: number; status: string; q: string }) => Promise<Paginated<T>>;
  statuses: { value: string; label: string }[];
  initialStatus?: string;
  searchPlaceholder?: string;
  renderItem: (item: T, reload: () => void) => React.ReactElement;
  empty?: string;
}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (p = 1) => {
      try {
        setError(null);
        const res = await fetcher({ page: p, status, q: q.trim() });
        setItems((prev) => (p === 1 ? res.items : [...(prev ?? []), ...res.items]));
        setPage(p);
        setTotal(res.total);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [fetcher, status, q],
  );

  // Rechargé à chaque affichage de l'écran et à chaque changement de filtre
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => load(1), 250);
      return () => clearTimeout(t);
    }, [load]),
  );

  const render: ListRenderItem<T> = ({ item }) => renderItem(item, () => load(1));

  return (
    <FlatList
      style={ui.screen}
      contentContainerStyle={ui.content}
      data={items ?? []}
      keyExtractor={(i) => i.id}
      renderItem={render}
      ItemSeparatorComponent={() => <View style={{ height: space(3) }} />}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (items && items.length < total) load(page + 1);
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.violet}
          onRefresh={async () => {
            setRefreshing(true);
            await load(1);
            setRefreshing(false);
          }}
        />
      }
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ marginBottom: space(4) }}>
          {searchPlaceholder && (
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.muted}
              style={ui.search}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {statuses.map((s) => (
              <Pressable
                key={s.value}
                onPress={() => setStatus(s.value)}
                style={[ui.chip, status === s.value && ui.chipActive]}
              >
                <Text style={[ui.chipText, status === s.value && { color: '#fff' }]}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {items && <Text style={ui.count}>{total} résultat(s)</Text>}
          {error && <Text style={ui.error}>{error}</Text>}
          {!error && items === null && (
            <ActivityIndicator color={colors.violet} style={{ marginTop: space(6) }} />
          )}
        </View>
      }
      ListEmptyComponent={items ? <Text style={ui.muted}>{empty}</Text> : undefined}
    />
  );
}

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Tunis',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  content: { padding: space(4), paddingBottom: space(12) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface2,
    padding: space(4),
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space(2) },
  title: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  ink: { color: colors.ink },
  muted: { color: colors.muted },
  small: { color: colors.muted, fontSize: 12 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  btn: {
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    borderRadius: radius.md,
    borderWidth: 1,
  },
  btnGhost: { borderColor: colors.surface2 },
  btnDanger: { borderColor: 'rgba(236,72,153,0.5)' },
  btnPrimary: { borderColor: colors.violet, backgroundColor: colors.violet },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3) },
  search: {
    backgroundColor: colors.surface,
    color: colors.ink,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface2,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    fontSize: 15,
    marginBottom: space(3),
  },
  chip: {
    paddingHorizontal: space(4),
    paddingVertical: space(2),
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    marginRight: space(2),
  },
  chipActive: { backgroundColor: colors.violet },
  chipText: { color: colors.muted, fontWeight: '600' },
  count: { color: colors.muted, fontSize: 12, marginTop: space(3) },
  error: { color: colors.pink, marginTop: space(3) },
  quote: {
    backgroundColor: colors.night,
    borderRadius: radius.md,
    padding: space(3),
    marginTop: space(3),
  },
});
