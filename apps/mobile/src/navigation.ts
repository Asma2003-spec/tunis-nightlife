import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Tabs: undefined;
  Venue: { slug: string; name?: string };
  AdminHome: undefined;
  AdminReviews: undefined;
  AdminReports: undefined;
  AdminVenues: undefined;
  AdminEvents: undefined;
  AdminUsers: undefined;
};

export type TabParamList = {
  Explorer: undefined;
  Carte: undefined;
  Compte: undefined;
};

export type VenueScreenProps = NativeStackScreenProps<RootStackParamList, 'Venue'>;
