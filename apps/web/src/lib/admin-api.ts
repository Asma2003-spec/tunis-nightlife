'use client';

import type {
  AdminEventRow,
  AdminReportRow,
  AdminReviewRow,
  AdminStats,
  AdminUserRow,
  AdminVenueDetail,
  AdminVenueRow,
  CreateReportInput,
  EventUpsertInput,
  Paginated,
  UserRole,
  VenueStatus,
  VenueUpsertInput,
} from '@tn/contracts';
import { ApiError, BROWSER_API } from './api';
import { SERVER_DOWN_MESSAGE, fetchWithWake } from './api-wake';

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetchWithWake(`${BROWSER_API}${path}`, {
    ...init,
    credentials: 'include',
    // Pour un FormData, le navigateur fixe lui-même le Content-Type multipart
    headers: isForm ? init.headers : { 'content-type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      errors?: { path: string; message: string }[];
    } | null;
    const first = body?.errors?.[0];
    throw new ApiError(
      res.status,
      res.status === 413
        ? 'Fichier trop lourd (5 Mo maximum)'
        : first
          ? `${first.path ? first.path + ' : ' : ''}${first.message}`
          : (body?.message ?? (body ? 'Erreur' : SERVER_DOWN_MESSAGE)),
    );
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

const qs = (p: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(p)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString();

type ListParams = { page?: number; q?: string; status?: string; pageSize?: number };
const json = (body: unknown) => JSON.stringify(body);

export const adminApi = {
  stats: () => call<AdminStats>('/admin/stats'),

  meta: () =>
    call<{ cities: { slug: string; name: string }[]; genres: { slug: string; name: string }[] }>(
      '/admin/venues/meta',
    ),
  venues: (p: ListParams = {}) => call<Paginated<AdminVenueRow>>(`/admin/venues?${qs(p)}`),
  venue: (id: string) => call<AdminVenueDetail>(`/admin/venues/${id}`),
  createVenue: (body: VenueUpsertInput) =>
    call<AdminVenueDetail>('/admin/venues', { method: 'POST', body: json(body) }),
  updateVenue: (id: string, body: VenueUpsertInput) =>
    call<AdminVenueDetail>(`/admin/venues/${id}`, { method: 'PUT', body: json(body) }),
  setVenueStatus: (id: string, status: VenueStatus) =>
    call<void>(`/admin/venues/${id}/status`, { method: 'PATCH', body: json({ status }) }),
  uploadPhoto: (id: string, file: File, altText: string) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('altText', altText);
    return call<{ id: string }>(`/admin/venues/${id}/photos`, { method: 'POST', body: form });
  },
  reorderPhotos: (id: string, photoIds: string[]) =>
    call<void>(`/admin/venues/${id}/photos/order`, { method: 'PUT', body: json({ photoIds }) }),
  deletePhoto: (id: string, photoId: string) =>
    call<void>(`/admin/venues/${id}/photos/${photoId}`, { method: 'DELETE' }),

  events: (p: ListParams = {}) => call<Paginated<AdminEventRow>>(`/admin/events?${qs(p)}`),
  createEvent: (body: EventUpsertInput) =>
    call<unknown>('/admin/events', { method: 'POST', body: json(body) }),
  updateEvent: (id: string, body: EventUpsertInput) =>
    call<unknown>(`/admin/events/${id}`, { method: 'PUT', body: json(body) }),
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
  resetPassword: (id: string, password: string) =>
    call<void>(`/admin/users/${id}/password`, { method: 'PUT', body: json({ password }) }),

  /** Signalement par un membre (côté public). */
  report: (body: CreateReportInput) =>
    call<{ ok: true }>('/reports', { method: 'POST', body: json(body) }),
};
