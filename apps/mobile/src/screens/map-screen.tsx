import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Circle, Marker, type Region } from 'react-native-maps';
import type { VenueSummary } from '@tn/contracts';
import { api } from '../api';
import type { RootStackParamList } from '../navigation';
import { colors, formatKm, formatRating, radius, space } from '../theme';

const RADII = [2, 5, 10, 25, 50];
const GRAND_TUNIS: Region = {
  latitude: 36.75,
  longitude: 10.35,
  latitudeDelta: 0.9,
  longitudeDelta: 0.9,
};
// Position de démonstration (La Marsa) pour tester hors de Tunisie
const DEMO_POSITION = { latitude: 36.8782, longitude: 10.3247 };

type Pos = { latitude: number; longitude: number };

export function MapScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const map = useRef<MapView>(null);
  const [all, setAll] = useState<VenueSummary[]>([]);
  const [nearby, setNearby] = useState<VenueSummary[] | null>(null);
  const [position, setPosition] = useState<Pos | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [status, setStatus] = useState<'idle' | 'locating'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api
      .venues()
      .then((r) => setAll(r.items))
      .catch((e: Error) => setMessage(e.message));
  }, []);

  async function search(pos: Pos, r: number) {
    const list = await api.nearby(pos.latitude, pos.longitude, r);
    setNearby(list);
    // Zoom adapté au rayon choisi
    const delta = (r / 111) * 2.4;
    map.current?.animateToRegion({ ...pos, latitudeDelta: delta, longitudeDelta: delta }, 600);
  }

  /** Permission demandée uniquement quand l'utilisateur touche le bouton (« pendant l'utilisation »). */
  async function locate() {
    setStatus('locating');
    setMessage('');
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setMessage(
          'Localisation refusée. Tu peux l’activer dans les réglages, ou utiliser la position de démo.',
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setPosition(pos);
      await search(pos, radiusKm);
    } catch (e) {
      setMessage((e as Error).message || 'Position introuvable.');
    } finally {
      setStatus('idle');
    }
  }

  async function applyDemo() {
    setPosition(DEMO_POSITION);
    setMessage('Position de démonstration : La Marsa.');
    await search(DEMO_POSITION, radiusKm).catch(() => undefined);
  }

  function changeRadius(r: number) {
    setRadiusKm(r);
    if (position) search(position, r).catch(() => undefined);
  }

  const shown = nearby ?? all;

  return (
    <View style={styles.screen}>
      <MapView
        ref={map}
        style={styles.map}
        initialRegion={GRAND_TUNIS}
        userInterfaceStyle="dark"
        showsUserLocation={position !== null && position !== DEMO_POSITION}
      >
        {position && (
          <>
            <Marker coordinate={position} pinColor={colors.blue} title="Vous êtes ici" />
            <Circle
              center={position}
              radius={radiusKm * 1000}
              strokeColor="rgba(56,189,248,0.8)"
              fillColor="rgba(56,189,248,0.08)"
            />
          </>
        )}
        {shown.map((v) => (
          <Marker
            key={v.id}
            coordinate={{ latitude: v.latitude, longitude: v.longitude }}
            pinColor={colors.violet}
          >
            <Callout onPress={() => nav.navigate('Venue', { slug: v.slug, name: v.name })}>
              <View style={{ maxWidth: 220 }}>
                <Text style={{ fontWeight: '700' }}>{v.name}</Text>
                <Text>
                  {v.rating.average !== null ? `★ ${formatRating(v.rating.average)} · ` : ''}
                  {v.distanceKm !== undefined ? formatKm(v.distanceKm) : v.city.name}
                </Text>
                <Text style={{ color: colors.violet, marginTop: 2 }}>Voir la fiche ›</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={styles.panel}>
        <View style={styles.row}>
          <Pressable onPress={locate} style={styles.primary} disabled={status === 'locating'}>
            {status === 'locating' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>📍 {position ? 'Actualiser' : 'Me localiser'}</Text>
            )}
          </Pressable>
          <Pressable onPress={applyDemo}>
            <Text style={styles.link}>Position de démo</Text>
          </Pressable>
        </View>

        <View style={[styles.row, { marginTop: space(3) }]}>
          {RADII.map((r) => (
            <Pressable
              key={r}
              onPress={() => changeRadius(r)}
              style={[styles.chip, radiusKm === r && styles.chipActive]}
            >
              <Text style={[styles.chipText, radiusKm === r && { color: '#fff' }]}>{r} km</Text>
            </Pressable>
          ))}
        </View>
        {!!message && <Text style={styles.message}>{message}</Text>}

        <Text style={styles.heading}>
          {nearby
            ? nearby.length
              ? `${nearby.length} à moins de ${radiusKm} km`
              : `Rien à moins de ${radiusKm} km`
            : `${all.length} établissements`}
        </Text>
        <FlatList
          horizontal
          data={shown}
          keyExtractor={(v) => v.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={styles.mini}
              onPress={() => nav.navigate('Venue', { slug: item.slug, name: item.name })}
            >
              <Text style={styles.miniName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.miniMeta}>
                {item.distanceKm !== undefined ? formatKm(item.distanceKm) : item.city.name}
                {item.rating.average !== null ? `  ★ ${formatRating(item.rating.average)}` : ''}
              </Text>
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`,
                  )
                }
              >
                <Text style={styles.link}>Itinéraire ›</Text>
              </Pressable>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  map: { flex: 1 },
  panel: {
    backgroundColor: colors.night,
    padding: space(4),
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    marginTop: -radius.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3), flexWrap: 'wrap' },
  primary: {
    backgroundColor: colors.violet,
    paddingHorizontal: space(5),
    paddingVertical: space(3),
    borderRadius: radius.full,
    minWidth: 150,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  link: { color: colors.violetGlow, fontWeight: '600' },
  chip: {
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.violet },
  chipText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  message: { color: colors.muted, marginTop: space(2) },
  heading: { color: colors.ink, fontWeight: '700', marginTop: space(4), marginBottom: space(2) },
  mini: {
    width: 180,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space(3),
    marginRight: space(3),
    gap: 4,
  },
  miniName: { color: colors.ink, fontWeight: '700' },
  miniMeta: { color: colors.muted, fontSize: 13 },
});
