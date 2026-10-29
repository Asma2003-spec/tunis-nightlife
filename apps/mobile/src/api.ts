import * as SecureStore from 'expo-secure-store';
import {
  mediaUrl,
  type AdminEventRow,
  type AdminReportRow,
  type AdminReviewRow,
  type AdminStats,
  type AdminUserRow,
  type AdminVenueRow,
  type CreateReportInput,
  type UserRole,
  type VenueStatus,
  type AuthResponse,
  type CreateReviewInput,
  type EventItem,
  type LoginInput,
  type Paginated,
  type PublicUser,
  type RegisterInput,
  type ReviewItem,
  type ReviewsPage,
  type VenueDetail,
  type VenueSummary,
} from '@tn/contracts';

/**
 * Sur un téléphone physique, "localhost" désigne le téléphone lui-même :
 * définir EXPO_PUBLIC_API_URL dans apps/mobile/.env avec l'IP locale de l'ordinateur
 * (ex. http://192.168.1.20:4000/api/v1).
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const media = (key: string | null | undefined) => mediaUrl(API_URL, key);

const TOKEN_KEY = 'tn_access_token';

/** Le jeton est stocké dans le trousseau sécurisé du téléphone (Keychain / Keystore). */
export const tokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "L'API n'est pas joignable. Vérifie EXPO_PUBLIC_API_URL et le Wi-Fi.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      errors?: { message: string }[];
    } | null;
    throw new ApiError(res.status, body?.errors?.[0]?.message ?? body?.message ?? 'Erreur');
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

const qs = (p: Record<string, string | number | undefined>): string =>
  Object.entries(p)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

export const api = {
  venues: (p: Record<string, string | undefined> = {}) =>
    call<Paginated<VenueSummary>>(`/venues?${qs({ pageSize: 50, sort: 'rating', ...p })}`),
  venue: (slug: string) => call<VenueDetail>(`/venues/${slug}`),
  nearby: (lat: number, lng: number, radiusKm: number) =>
    call<VenueSummary[]>(`/venues/nearby?${qs({ lat, lng, radiusKm, limit: 50 })}`),
  filters: () =>
    call<{ cities: { slug: string; name: string }[]; genres: { slug: string; name: string }[] }>(
      '/filters',
    ),
  events: (venue?: string, limit = 10) => call<EventItem[]>(`/events?${qs({ venue, limit })}`),

  me: () => call<PublicUser | null>('/auth/me'),
  login: (input: LoginInput) =>
    call<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  register: (input: RegisterInput) =>
    call<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),

  reviews: (slug: string) => call<ReviewsPage>(`/venues/${slug}/reviews?pageSize=20`),
  myReview: (slug: string) => call<ReviewItem | null>(`/venues/${slug}/reviews/me`),
  saveReview: (slug: string, input: CreateReviewInput) =>
    call<ReviewItem>(`/venues/${slug}/reviews/me`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteReview: (slug: string) => call<void>(`/venues/${slug}/reviews/me`, { method: 'DELETE' }),

  favorites: () => call<VenueSummary[]>('/me/favorites'),
  addFavorite: (slug: string) => call<void>(`/me/favorites/${slug}`, { method: 'PUT' }),
  removeFavorite: (slug: string) => call<void>(`/me/favorites/${slug}`, { method: 'DELETE' }),

  report: (body: CreateReportInput) =>
    call<{ ok: true }>('/reports', { method: 'POST', body: JSON.stringify(body) }),
};

type ListParams = { page?: number; q?: string; status?: string; pageSize?: number };
const json = (b: unknown) => JSON.stringify(b);

/** Back-office : les droits sont vérifiés par l'API (rôle relu en base à chaque requête). */
export const adminApi = {
  stats: () => call<AdminStats>('/admin/stats'),
  venues: (p: ListParams = {}) => call<Paginated<AdminVenueRow>>(`/admin/venues?${qs(p)}`),
  setVenueStatus: (id: string, status: VenueStatus) =>
    call<void>(`/admin/venues/${id}/status`, { method: 'PATCH', body: json({ status }) }),
  events: (p: ListParams = {}) => call<Paginated<AdminEventRow>>(`/admin/events?${qs(p)}`),
  deleteEvent: (id: string) => call<void>(`/admin/events/${id}`, { method: 'DELETE' }),
  reviews: (p: ListParams = {}) => call<Paginated<AdminReviewRow>>(`/admin/reviews?${qs(p)}`),
  moderateReview: (id: string, status: 'PUBLISHED' | 'REJECTED') =>
    call<void>(`/admin/reviews/${id}`, { method: 'PATCH', body: json({ status }) }),
  reports: (p: ListParams = {}) => call<Paginated<AdminReportRow>>(`/admin/reports?${qs(p)}`),
  decideReport: (id: string, status: 'RESOLVED' | 'DISMISSED', hideTarget = false) =>
    call<void>(`/admin/reports/${id}`, { method: 'PATCH', body: json({ status, hideTarget }) }),
  users: (p: ListParams = {}) => call<Paginated<AdminUserRow>>(`/admin/users?${qs(p)}`),
  setRole: (id: string, role: UserRole) =>
    call<void>(`/admin/users/${id}/role`, { method: 'PATCH', body: json({ role }) }),
};
