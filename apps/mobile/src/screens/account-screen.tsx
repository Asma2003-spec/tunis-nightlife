import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { VenueSummary } from '@tn/contracts';
import { api } from '../api';
import { useAuth } from '../auth';
import { VenueCard } from '../components/venue-card';
import type { RootStackParamList } from '../navigation';
import { colors, radius, space } from '../theme';

export function AccountScreen() {
  const { user, logout } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [favorites, setFavorites] = useState<VenueSummary[]>([]);

  // Favoris rechargés à chaque fois que l'onglet est affiché
  useFocusEffect(
    useCallback(() => {
      if (user)
        api
          .favorites()
          .then(setFavorites)
          .catch(() => undefined);
    }, [user]),
  );

  if (!user) return <AuthForm />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Bonjour, {user.name.split(' ')[0]} 👋</Text>
      <Text style={styles.muted}>{user.email}</Text>

      {user.role !== 'USER' && (
        <Pressable onPress={() => nav.navigate('AdminHome')} style={styles.adminCard}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.adminTitle}>⚙︎ Back-office</Text>
            <Text style={styles.muted}>
              {user.role === 'ADMIN'
                ? 'Statistiques, établissements, événements, avis, signalements, utilisateurs'
                : 'Statistiques, avis et signalements'}
            </Text>
          </View>
          <Text style={{ color: colors.violetGlow, fontSize: 22 }}>›</Text>
        </Pressable>
      )}

      <Text style={styles.h2}>Mes favoris</Text>
      {favorites.length === 0 ? (
        <Text style={styles.muted}>
          Aucun favori pour l’instant. Ouvre une fiche et touche « ♡ Favori ».
        </Text>
      ) : (
        favorites.map((v) => (
          <View key={v.id} style={{ marginBottom: space(3) }}>
            <VenueCard
              venue={v}
              onPress={() => nav.navigate('Venue', { slug: v.slug, name: v.name })}
            />
          </View>
        ))
      )}

      <Pressable onPress={logout} style={[styles.secondary, { marginTop: space(8) }]}>
        <Text style={styles.secondaryText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

function AuthForm() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    if (mode === 'register' && !adult) return setError('Tu dois confirmer avoir 18 ans ou plus.');
    setBusy(true);
    try {
      if (mode === 'login') await login({ email, password });
      else await register({ name, email, password, ageConfirmed: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</Text>
        <Text style={[styles.muted, { marginBottom: space(6) }]}>
          Pour noter les établissements et garder tes favoris.
        </Text>

        {mode === 'register' && (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nom"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoComplete="name"
          />
        )}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'register' ? 'Mot de passe (8 caractères minimum)' : 'Mot de passe'}
          placeholderTextColor={colors.muted}
          style={styles.input}
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {mode === 'register' && (
          <View style={styles.switchRow}>
            <Switch value={adult} onValueChange={setAdult} trackColor={{ true: colors.violet }} />
            <Text style={styles.muted}>Je confirme avoir 18 ans ou plus</Text>
          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.primary} onPress={submit} disabled={busy}>
          <Text style={styles.primaryText}>
            {busy ? 'Patiente…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
          style={{ marginTop: space(5) }}
        >
          <Text style={styles.link}>
            {mode === 'login'
              ? 'Pas encore de compte ? Créer un compte'
              : 'Déjà un compte ? Se connecter'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  content: { padding: space(5), paddingTop: space(8), paddingBottom: space(16) },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800' },
  h2: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    marginTop: space(8),
    marginBottom: space(3),
  },
  muted: { color: colors.muted },
  input: {
    backgroundColor: colors.surface,
    color: colors.ink,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface2,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    fontSize: 16,
    marginBottom: space(3),
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    marginVertical: space(2),
  },
  error: { color: colors.pink, marginVertical: space(2) },
  primary: {
    backgroundColor: colors.violet,
    paddingVertical: space(3.5),
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: space(3),
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    borderWidth: 1,
    borderColor: colors.surface2,
    paddingVertical: space(3),
    borderRadius: radius.md,
    alignItems: 'center',
  },
  secondaryText: { color: colors.ink, fontWeight: '600' },
  link: { color: colors.violetGlow, fontWeight: '600', textAlign: 'center' },
  adminCard: {
    marginTop: space(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(3),
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: colors.violet,
    borderRadius: radius.lg,
    padding: space(4),
  },
  adminTitle: { color: colors.ink, fontWeight: '800', fontSize: 17, marginBottom: 2 },
});
