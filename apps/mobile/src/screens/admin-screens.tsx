import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  ROLE_LABELS,
  STATUS_LABELS,
  USER_ROLES,
  VENUE_STATUSES,
  VENUE_TYPE_LABELS,
  type AdminEventRow,
  type AdminReportRow,
  type AdminReviewRow,
  type AdminStats,
  type AdminUserRow,
  type AdminVenueRow,
} from '@tn/contracts';
import { adminApi } from '../api';
import { useAuth } from '../auth';
import { Stars } from '../components/stars';
import { ActionButton, AdminList, StatusBadge, formatDateTime, ui } from '../components/admin-ui';
import type { RootStackParamList } from '../navigation';
import { colors, formatRating, radius, space } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Exécute une action et affiche l'erreur éventuelle sans planter l'écran. */
async function run(action: () => Promise<unknown>, reload: () => void) {
  try {
    await action();
  } catch (e) {
    Alert.alert('Action impossible', (e as Error).message);
  }
  reload();
}

function confirm(title: string, message: string, onOk: () => void, destructive = false) {
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Confirmer', style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}

/* ------------------------------------------------------------------ */
/* Tableau de bord                                                     */
/* ------------------------------------------------------------------ */

function Kpi({
  label,
  value,
  hint,
  onPress,
}: {
  label: string;
  value: string | number;
  hint?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[ui.card, { flexBasis: '47%', flexGrow: 1 }]}
    >
      <Text style={ui.small}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 28, fontWeight: '800', marginTop: 4 }}>
        {value}
      </Text>
      {hint && <Text style={[ui.small, { marginTop: 2 }]}>{hint}</Text>}
    </Pressable>
  );
}

function MenuItem({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: string;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        ui.card,
        ui.row,
        { justifyContent: 'space-between', opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={ui.title}>
        {icon} {label}
      </Text>
      <View style={ui.row}>
        {!!badge && (
          <Text style={[ui.badge, { color: '#FCD34D', backgroundColor: 'rgba(245,158,11,0.15)' }]}>
            {badge}
          </Text>
        )}
        <Text style={ui.muted}>›</Text>
      </View>
    </Pressable>
  );
}

export function AdminHomeScreen() {
  const nav = useNavigation<Nav>();
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    try {
      setError(null);
      setStats(await adminApi.stats());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const max = stats ? Math.max(1, ...stats.reviewsPerDay.map((d) => d.count)) : 1;

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={ui.content}
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
    >
      <Text style={ui.small}>{user ? ROLE_LABELS[user.role] : ''}</Text>
      {error && <Text style={ui.error}>{error}</Text>}
      {!stats ? (
        !error && <ActivityIndicator color={colors.violet} style={{ marginTop: space(8) }} />
      ) : (
        <>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3), marginTop: space(3) }}
          >
            <Kpi
              label="Établissements publiés"
              value={stats.venues.PUBLISHED}
              hint={`${stats.venues.DRAFT} brouillon · ${stats.venues.SUSPENDED} suspendu`}
              onPress={isAdmin ? () => nav.navigate('AdminVenues') : undefined}
            />
            <Kpi
              label="Avis publiés"
              value={stats.reviews}
              hint={`+${stats.reviews7d} / 7 j · ★ ${stats.averageRating ? formatRating(stats.averageRating) : '—'}`}
              onPress={() => nav.navigate('AdminReviews')}
            />
            <Kpi
              label="Signalements"
              value={stats.openReports}
              hint={stats.openReports ? 'À traiter' : 'Rien en attente'}
              onPress={() => nav.navigate('AdminReports')}
            />
            <Kpi
              label="Membres"
              value={stats.users}
              hint={`+${stats.newUsers7d} / 7 j · ${stats.upcomingEvents} soirée(s)`}
              onPress={isAdmin ? () => nav.navigate('AdminUsers') : undefined}
            />
          </View>

          <View style={[ui.card, { marginTop: space(4) }]}>
            <Text style={ui.title}>Avis publiés — 14 jours</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                height: 110,
                gap: 4,
                marginTop: space(4),
              }}
            >
              {stats.reviewsPerDay.map((d) => (
                <View
                  key={d.date}
                  style={{
                    flex: 1,
                    height: `${(d.count / max) * 100}%`,
                    minHeight: d.count ? 4 : 1,
                    backgroundColor: colors.violet,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                />
              ))}
            </View>
          </View>

          <View style={[ui.card, { marginTop: space(4) }]}>
            <Text style={[ui.title, { marginBottom: space(2) }]}>Les mieux notés</Text>
            {stats.topVenues.map((v, i) => (
              <View
                key={v.slug}
                style={[ui.row, { justifyContent: 'space-between', paddingVertical: 4 }]}
              >
                <Text style={ui.ink} numberOfLines={1}>
                  {i + 1}. {v.name}
                </Text>
                <Text style={ui.muted}>
                  <Text style={{ color: colors.star }}>★</Text> {formatRating(v.average)} ({v.count}
                  )
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={[ui.title, { marginTop: space(6), marginBottom: space(3) }]}>Gestion</Text>
      <View style={{ gap: space(3) }}>
        <MenuItem
          icon="🚩"
          label="Signalements"
          badge={stats?.openReports}
          onPress={() => nav.navigate('AdminReports')}
        />
        <MenuItem icon="⭐" label="Avis" onPress={() => nav.navigate('AdminReviews')} />
        {isAdmin && (
          <>
            <MenuItem
              icon="🏙️"
              label="Établissements"
              onPress={() => nav.navigate('AdminVenues')}
            />
            <MenuItem icon="🎉" label="Événements" onPress={() => nav.navigate('AdminEvents')} />
            <MenuItem icon="👥" label="Utilisateurs" onPress={() => nav.navigate('AdminUsers')} />
          </>
        )}
      </View>
      {isAdmin && (
        <Text style={[ui.small, { marginTop: space(6), lineHeight: 18 }]}>
          La création d’établissements, l’envoi de photos et le choix de l’emplacement sur la carte
          se font depuis le back-office Web (/admin), plus confortable sur grand écran.
        </Text>
      )}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* Signalements                                                        */
/* ------------------------------------------------------------------ */

const TARGETS = { REVIEW: 'Avis', VENUE: 'Établissement', EVENT: 'Événement' } as const;

export function AdminReportsScreen() {
  const fetcher = useCallback(
    (p: { page: number; status: string }) => adminApi.reports({ page: p.page, status: p.status }),
    [],
  );
  return (
    <AdminList<AdminReportRow>
      fetcher={fetcher}
      initialStatus="OPEN"
      statuses={[
        { value: 'OPEN', label: 'À traiter' },
        { value: 'RESOLVED', label: 'Traités' },
        { value: 'DISMISSED', label: 'Classés' },
        { value: '', label: 'Tous' },
      ]}
      empty="🎉 Aucun signalement."
      renderItem={(r, reload) => (
        <View style={ui.card}>
          <View style={ui.row}>
            <Text style={[ui.badge, { color: colors.ink, backgroundColor: colors.surface2 }]}>
              {TARGETS[r.targetType]}
            </Text>
            <Text style={ui.title}>{r.reason}</Text>
            <StatusBadge status={r.status} />
          </View>
          <Text style={[ui.small, { marginTop: 4 }]}>
            par {r.reporter.name} · {formatDateTime(r.createdAt)}
          </Text>
          {r.details && <Text style={[ui.muted, { marginTop: space(2) }]}>« {r.details} »</Text>}
          <View style={ui.quote}>
            {r.target ? (
              <>
                <View style={ui.row}>
                  <Text style={ui.ink}>{r.target.label}</Text>
                  {r.target.status && <StatusBadge status={r.target.status} />}
                </View>
                {r.target.excerpt !== undefined && (
                  <Text style={[ui.muted, { marginTop: 4 }]}>
                    {r.target.excerpt || 'Note sans commentaire'}
                  </Text>
                )}
              </>
            ) : (
              <Text style={ui.muted}>Contenu supprimé depuis.</Text>
            )}
          </View>
          {r.status === 'OPEN' ? (
            <View style={ui.actions}>
              {r.targetType === 'REVIEW' && r.target?.status !== 'REJECTED' && (
                <ActionButton
                  tone="danger"
                  label="Masquer l’avis et clore"
                  onPress={() => run(() => adminApi.decideReport(r.id, 'RESOLVED', true), reload)}
                />
              )}
              <ActionButton
                label="Traité"
                onPress={() => run(() => adminApi.decideReport(r.id, 'RESOLVED'), reload)}
              />
              <ActionButton
                label="Sans suite"
                onPress={() => run(() => adminApi.decideReport(r.id, 'DISMISSED'), reload)}
              />
            </View>
          ) : (
            r.handledBy && (
              <Text style={[ui.small, { marginTop: space(2) }]}>Traité par {r.handledBy.name}</Text>
            )
          )}
        </View>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Avis                                                                */
/* ------------------------------------------------------------------ */

export function AdminReviewsScreen() {
  const fetcher = useCallback(
    (p: { page: number; status: string; q: string }) => adminApi.reviews(p),
    [],
  );
  return (
    <AdminList<AdminReviewRow>
      fetcher={fetcher}
      searchPlaceholder="Rechercher dans les commentaires…"
      statuses={[
        { value: '', label: 'Tous' },
        { value: 'PUBLISHED', label: 'Publiés' },
        { value: 'REJECTED', label: 'Masqués' },
      ]}
      empty="Aucun avis."
      renderItem={(r, reload) => (
        <View style={ui.card}>
          <View style={ui.row}>
            <Stars value={r.rating} />
            <Text style={ui.title}>{r.venue.name}</Text>
            <StatusBadge status={r.status} />
            {r.openReports > 0 && (
              <Text
                style={[ui.badge, { color: '#FCD34D', backgroundColor: 'rgba(245,158,11,0.15)' }]}
              >
                🚩 {r.openReports}
              </Text>
            )}
          </View>
          <Text style={[ui.small, { marginTop: 4 }]}>
            {r.author.name} · {formatDateTime(r.createdAt)}
          </Text>
          <Text style={[r.comment ? ui.ink : ui.muted, { marginTop: space(2) }]}>
            {r.comment || 'Note sans commentaire'}
          </Text>
          <View style={ui.actions}>
            {r.status !== 'PUBLISHED' && (
              <ActionButton
                label="Publier"
                onPress={() => run(() => adminApi.moderateReview(r.id, 'PUBLISHED'), reload)}
              />
            )}
            {r.status !== 'REJECTED' && (
              <ActionButton
                tone="danger"
                label="Masquer"
                onPress={() =>
                  confirm(
                    'Masquer cet avis ?',
                    'Il ne comptera plus dans la note moyenne.',
                    () => run(() => adminApi.moderateReview(r.id, 'REJECTED'), reload),
                    true,
                  )
                }
              />
            )}
          </View>
        </View>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Établissements                                                      */
/* ------------------------------------------------------------------ */

export function AdminVenuesScreen() {
  const nav = useNavigation<Nav>();
  const fetcher = useCallback(
    (p: { page: number; status: string; q: string }) => adminApi.venues(p),
    [],
  );

  function changeStatus(v: AdminVenueRow, reload: () => void) {
    Alert.alert(v.name, 'Nouveau statut', [
      ...VENUE_STATUSES.filter((s) => s !== v.status).map((s) => ({
        text: STATUS_LABELS[s]!,
        style: (s === 'SUSPENDED' ? 'destructive' : 'default') as 'destructive' | 'default',
        onPress: () => run(() => adminApi.setVenueStatus(v.id, s), reload),
      })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }

  return (
    <AdminList<AdminVenueRow>
      fetcher={fetcher}
      searchPlaceholder="Rechercher par nom…"
      statuses={[
        { value: '', label: 'Tous' },
        { value: 'PUBLISHED', label: 'Publiés' },
        { value: 'DRAFT', label: 'Brouillons' },
        { value: 'SUSPENDED', label: 'Suspendus' },
      ]}
      empty="Aucun établissement."
      renderItem={(v, reload) => (
        <View style={ui.card}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={ui.title}>
              {v.name}
              {v.isDemo ? (
                <Text style={{ color: colors.violetGlow, fontSize: 12 }}> démo</Text>
              ) : null}
            </Text>
            <StatusBadge status={v.status} />
          </View>
          <Text style={[ui.small, { marginTop: 4 }]}>
            {VENUE_TYPE_LABELS[v.type]} · {v.city} · {v.photoCount} photo(s)
            {v.rating.average !== null
              ? `  ·  ★ ${formatRating(v.rating.average)} (${v.rating.count})`
              : ''}
          </Text>
          <View style={ui.actions}>
            <ActionButton
              tone="primary"
              label="Changer le statut"
              onPress={() => changeStatus(v, reload)}
            />
            {v.status === 'PUBLISHED' && (
              <ActionButton
                label="Voir la fiche"
                onPress={() => nav.navigate('Venue', { slug: v.slug, name: v.name })}
              />
            )}
          </View>
        </View>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Événements                                                          */
/* ------------------------------------------------------------------ */

export function AdminEventsScreen() {
  const fetcher = useCallback(
    (p: { page: number; status: string; q: string }) => adminApi.events(p),
    [],
  );
  return (
    <AdminList<AdminEventRow>
      fetcher={fetcher}
      searchPlaceholder="Rechercher par titre…"
      statuses={[
        { value: '', label: 'Tous' },
        { value: 'PUBLISHED', label: 'Publiés' },
        { value: 'DRAFT', label: 'Brouillons' },
        { value: 'CANCELLED', label: 'Annulés' },
      ]}
      empty="Aucun événement."
      renderItem={(e, reload) => {
        const past = new Date(e.endsAt) < new Date();
        return (
          <View style={[ui.card, past && { opacity: 0.6 }]}>
            <Text style={{ color: colors.violetGlow, fontSize: 12, fontWeight: '700' }}>
              {formatDateTime(e.startsAt).toUpperCase()}
              {past ? ' · TERMINÉ' : ''}
            </Text>
            <View style={[ui.row, { justifyContent: 'space-between', marginTop: 4 }]}>
              <Text style={ui.title}>{e.title}</Text>
              <StatusBadge status={e.status} />
            </View>
            <Text style={ui.small}>{e.venue.name}</Text>
            <View style={ui.actions}>
              <ActionButton
                tone="danger"
                label="Supprimer"
                onPress={() =>
                  confirm(
                    `Supprimer « ${e.title} » ?`,
                    'Cette action est définitive.',
                    () => run(() => adminApi.deleteEvent(e.id), reload),
                    true,
                  )
                }
              />
            </View>
          </View>
        );
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Utilisateurs                                                        */
/* ------------------------------------------------------------------ */

export function AdminUsersScreen() {
  const { user: me } = useAuth();
  const fetcher = useCallback(
    (p: { page: number; status: string; q: string }) => adminApi.users(p),
    [],
  );

  function changeRole(u: AdminUserRow, reload: () => void) {
    Alert.alert(u.name, 'Choisir le rôle', [
      ...USER_ROLES.filter((r) => r !== u.role).map((r) => ({
        text: ROLE_LABELS[r],
        onPress: () => run(() => adminApi.setRole(u.id, r), reload),
      })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }

  return (
    <AdminList<AdminUserRow>
      fetcher={fetcher}
      searchPlaceholder="Nom ou email…"
      statuses={[
        { value: '', label: 'Tous' },
        { value: 'ADMIN', label: 'Admins' },
        { value: 'MODERATOR', label: 'Modérateurs' },
        { value: 'USER', label: 'Utilisateurs' },
      ]}
      empty="Aucun utilisateur."
      renderItem={(u, reload) => (
        <View style={[ui.card, ui.row, { justifyContent: 'space-between' }]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={ui.title}>
              {u.name}
              {u.id === me?.id ? (
                <Text style={{ color: colors.violetGlow, fontSize: 12 }}> (toi)</Text>
              ) : null}
            </Text>
            <Text style={ui.small}>{u.email}</Text>
            <Text style={ui.small}>{u.reviewCount} avis</Text>
          </View>
          <Pressable
            disabled={u.id === me?.id}
            onPress={() => changeRole(u, reload)}
            style={{
              borderWidth: 1,
              borderColor: u.role === 'USER' ? colors.surface2 : colors.violet,
              borderRadius: radius.md,
              paddingHorizontal: space(3),
              paddingVertical: space(2),
              opacity: u.id === me?.id ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                color: u.role === 'USER' ? colors.ink : colors.violetGlow,
                fontWeight: '600',
              }}
            >
              {ROLE_LABELS[u.role]} ▾
            </Text>
          </Pressable>
        </View>
      )}
    />
  );
}
