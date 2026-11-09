import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Énumérations — doivent rester alignées avec apps/api/prisma/schema */
/* ------------------------------------------------------------------ */

export const VENUE_TYPES = ['NIGHTCLUB', 'LOUNGE', 'BAR', 'ROOFTOP', 'BEACH_CLUB'] as const;
export const PRICE_RANGES = ['BUDGET', 'MODERATE', 'EXPENSIVE', 'LUXURY'] as const;
export const USER_ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;

export const VenueTypeSchema = z.enum(VENUE_TYPES);
export const PriceRangeSchema = z.enum(PRICE_RANGES);
export const UserRoleSchema = z.enum(USER_ROLES);

export type VenueType = z.infer<typeof VenueTypeSchema>;
export type PriceRange = z.infer<typeof PriceRangeSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export const PAGE_SIZE_MAX = 50;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(20),
});

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/* ------------------------------------------------------------------ */
/* Établissements                                                      */
/* ------------------------------------------------------------------ */

/** Limites géographiques larges de la Tunisie, utilisées pour valider les coordonnées. */
export const TUNISIA_BOUNDS = { minLat: 30.2, maxLat: 37.6, minLng: 7.5, maxLng: 11.7 } as const;

/** Rayon maximal autorisé pour la recherche de proximité (évite les requêtes coûteuses). */
export const NEARBY_MAX_RADIUS_KM = 50;

export const VenueListQuerySchema = PaginationQuerySchema.extend({
  q: z.string().trim().min(1).max(80).optional(),
  city: z.string().trim().min(1).max(60).optional(), // slug de ville
  type: VenueTypeSchema.optional(),
  priceRange: PriceRangeSchema.optional(),
  genre: z.string().trim().min(1).max(40).optional(), // slug de genre musical
  minRating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(['name', 'rating', 'newest']).default('rating'),
});
export type VenueListQuery = z.infer<typeof VenueListQuerySchema>;

export const VenueNearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(NEARBY_MAX_RADIUS_KM).default(10),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(20),
});
export type VenueNearbyQuery = z.infer<typeof VenueNearbyQuerySchema>;

export interface RatingSummary {
  /** Moyenne des avis publiés, arrondie à une décimale. null s'il n'y a aucun avis. */
  average: number | null;
  /** Nombre d'avis publiés — toujours affiché à côté de la moyenne. */
  count: number;
}

export interface VenueSummary {
  id: string;
  slug: string;
  name: string;
  type: VenueType;
  city: { slug: string; name: string };
  priceRange: PriceRange;
  latitude: number;
  longitude: number;
  coverPhotoKey: string | null;
  rating: RatingSummary;
  /** true si l'établissement est fictif (données de démonstration du portfolio). */
  isDemo: boolean;
  /** Présent uniquement pour la recherche de proximité. */
  distanceKm?: number;
}

export interface OpeningHoursSlot {
  /** 0 = dimanche … 6 = samedi */
  weekday: number;
  /** Minutes depuis minuit, 0–1439 */
  opensAt: number;
  /** Minutes depuis minuit. Si closesAt <= opensAt, la plage se termine le lendemain. */
  closesAt: number;
}

export interface VenueDetail extends VenueSummary {
  description: string;
  address: string;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  genres: { slug: string; name: string }[];
  photos: { storageKey: string; altText: string; position: number }[];
  openingHours: OpeningHoursSlot[];
  lastVerifiedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Avis                                                                */
/* ------------------------------------------------------------------ */

/** Note obligatoire (1 à 5 étoiles), commentaire facultatif. */
export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});
export type CreateReviewInput = z.input<typeof CreateReviewSchema>;

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  author: { name: string };
  /** true si l'avis appartient à l'utilisateur connecté */
  isMine?: boolean;
}

export interface ReviewsPage extends Paginated<ReviewItem> {
  rating: RatingSummary;
  /** Répartition des notes publiées : clé = nombre d'étoiles */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/* ------------------------------------------------------------------ */
/* Comptes                                                             */
/* ------------------------------------------------------------------ */

export const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .email()
    .max(254)
    .transform((e) => e.toLowerCase()),
  password: z.string().min(8, 'Au moins 8 caractères').max(128),
  /** L'utilisateur confirme avoir 18 ans ou plus. */
  ageConfirmed: z.literal(true, { message: 'Tu dois confirmer avoir 18 ans ou plus' }),
});
export type RegisterInput = z.input<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((e) => e.toLowerCase()),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.input<typeof LoginSchema>;

/** « Mot de passe oublié » : demande d'un lien par email. */
export const ForgotPasswordSchema = z.object({
  email: z
    .email('Adresse email invalide')
    .max(254)
    .transform((e) => e.toLowerCase()),
});
export type ForgotPasswordInput = z.input<typeof ForgotPasswordSchema>;

/** Nouveau mot de passe choisi depuis le lien reçu par email. */
export const ResetPasswordSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Lien invalide ou expiré'),
  password: z.string().min(8, 'Au moins 8 caractères').max(128, '128 caractères maximum'),
});
export type ResetPasswordInput = z.input<typeof ResetPasswordSchema>;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: PublicUser;
  /** Jeton pour le mobile (le Web utilise le cookie HttpOnly). */
  accessToken: string;
}

/* ------------------------------------------------------------------ */
/* Événements                                                          */
/* ------------------------------------------------------------------ */

export const EventListQuerySchema = z.object({
  venue: z.string().trim().min(1).max(120).optional(), // slug d'établissement
  city: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(20),
});
export type EventListQuery = z.infer<typeof EventListQuerySchema>;

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  coverKey: string | null;
  venue: { slug: string; name: string; city: string; coverPhotoKey: string | null };
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

/** URL publique d'un média à partir de l'URL de l'API (ex. http://host:4000/api/v1). */
export function mediaUrl(apiUrl: string, key: string | null | undefined): string | null {
  if (!key) return null;
  return `${apiUrl.replace(/\/api\/v\d+\/?$/, '')}/media/${key}`;
}

export const WEEKDAYS_FR = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  NIGHTCLUB: 'Boîte de nuit',
  LOUNGE: 'Lounge',
  BAR: 'Bar',
  ROOFTOP: 'Rooftop',
  BEACH_CLUB: 'Beach club',
};

export const PRICE_LABELS: Record<PriceRange, string> = {
  BUDGET: 'DT',
  MODERATE: 'DT DT',
  EXPENSIVE: 'DT DT DT',
  LUXURY: 'DT DT DT DT',
};

/** Heure locale de Tunis (UTC+1, pas d'heure d'été) : jour 0–6 et minutes depuis minuit. */
export function tunisNow(date = new Date()): { weekday: number; minutes: number } {
  const t = new Date(date.getTime() + 60 * 60 * 1000);
  return { weekday: t.getUTCDay(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

/** Indique si l'établissement est ouvert maintenant (gère les plages qui finissent après minuit). */
export function isOpenNow(slots: OpeningHoursSlot[], date = new Date()): boolean {
  const { weekday, minutes } = tunisNow(date);
  const yesterday = (weekday + 6) % 7;
  return slots.some((s) => {
    const overnight = s.closesAt <= s.opensAt;
    if (s.weekday === weekday) {
      return overnight ? minutes >= s.opensAt : minutes >= s.opensAt && minutes < s.closesAt;
    }
    // Plage commencée la veille et qui se termine aujourd'hui
    return s.weekday === yesterday && overnight && minutes < s.closesAt;
  });
}

/** Formate des minutes depuis minuit en "HH:MM". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export * from './admin';
