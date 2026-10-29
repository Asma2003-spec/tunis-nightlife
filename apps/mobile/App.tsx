import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth';
import type { RootStackParamList, TabParamList } from './src/navigation';
import { AccountScreen } from './src/screens/account-screen';
import {
  AdminEventsScreen,
  AdminHomeScreen,
  AdminReportsScreen,
  AdminReviewsScreen,
  AdminUsersScreen,
  AdminVenuesScreen,
} from './src/screens/admin-screens';
import { ExploreScreen } from './src/screens/explore-screen';
import { MapScreen } from './src/screens/map-screen';
import { VenueScreen } from './src/screens/venue-screen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.violet,
    background: colors.night,
    card: colors.night,
    text: colors.ink,
    border: colors.surface2,
  },
};

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: string }) {
    return <Text style={{ color, fontSize: 20 }}>{glyph}</Text>;
  };

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.violetGlow,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.night, borderTopColor: colors.surface2 },
        headerStyle: { backgroundColor: colors.night },
        headerTintColor: colors.ink,
      }}
    >
      <Tab.Screen
        name="Explorer"
        component={ExploreScreen}
        options={{ headerShown: false, tabBarIcon: icon('✦') }}
      />
      <Tab.Screen
        name="Carte"
        component={MapScreen}
        options={{ title: 'Autour de moi', tabBarLabel: 'Carte', tabBarIcon: icon('📍') }}
      />
      <Tab.Screen
        name="Compte"
        component={AccountScreen}
        options={{ title: 'Mon compte', tabBarIcon: icon('👤') }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="light" />
          <Stack.Navigator>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="Venue"
              component={VenueScreen}
              options={({ route }) => ({
                title: route.params.name ?? '',
                headerTransparent: false,
                headerStyle: { backgroundColor: colors.night },
                headerTintColor: colors.ink,
                headerBackTitle: 'Retour',
              })}
            />
            {/* Back-office : écrans accessibles depuis l'onglet Compte (admin et modérateur) */}
            <Stack.Group
              screenOptions={{
                headerStyle: { backgroundColor: colors.night },
                headerTintColor: colors.ink,
                headerBackTitle: 'Retour',
              }}
            >
              <Stack.Screen
                name="AdminHome"
                component={AdminHomeScreen}
                options={{ title: 'Back-office' }}
              />
              <Stack.Screen
                name="AdminReports"
                component={AdminReportsScreen}
                options={{ title: 'Signalements' }}
              />
              <Stack.Screen
                name="AdminReviews"
                component={AdminReviewsScreen}
                options={{ title: 'Avis' }}
              />
              <Stack.Screen
                name="AdminVenues"
                component={AdminVenuesScreen}
                options={{ title: 'Établissements' }}
              />
              <Stack.Screen
                name="AdminEvents"
                component={AdminEventsScreen}
                options={{ title: 'Événements' }}
              />
              <Stack.Screen
                name="AdminUsers"
                component={AdminUsersScreen}
                options={{ title: 'Utilisateurs' }}
              />
            </Stack.Group>
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
