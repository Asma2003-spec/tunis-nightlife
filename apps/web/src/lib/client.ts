'use client';

import type {
  AuthResponse,
  CreateReviewInput,
  LoginInput,
  PublicUser,
  RegisterInput,
  ReviewItem,
  ReviewsPage,
  VenueSummary,
} from '@tn/contracts';
import { ApiError, BROWSER_API } from './api';

/**
 * Appels depuis le navigateur. `credentials: 'include'` envoie le cookie de session
 * HttpOnly : le jeton n'est jamais lisible par le JavaScript de la page.
 */
async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BROWSER_API}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      errors?: { message: string }[];
    } | null;
    throw new ApiError(res.status, body?.errors?.[0]?.message ?? body?.message ?? 'Erreur réseau');
  }
  const text = await res.text(); // corps vide (204, ou null renvoyé par l'API)
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  me: () => call<PublicUser | null>('/auth/me'),
  login: (input: LoginInput) =>
    call<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  register: (input: RegisterInput) =>
    call<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => call<void>('/auth/logout', { method: 'POST' }),

  reviews: (slug: string, page = 1) =>
    call<ReviewsPage>(`/venues/${slug}/reviews?page=${page}&pageSize=10`),
  myReview: (slug: string) => call<ReviewItem | null>(`/venues/${slug}/reviews/me`),
  saveReview: (slug: string, input: CreateReviewInput) =>
    call<ReviewItem>(`/venues/${slug}/reviews/me`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteReview: (slug: string) => call<void>(`/venues/${slug}/reviews/me`, { method: 'DELETE' }),

  favorites: () => call<VenueSummary[]>('/me/favorites'),
  addFavorite: (slug: string) => call<void>(`/me/favorites/${slug}`, { method: 'PUT' }),
  removeFavorite: (slug: string) => call<void>(`/me/favorites/${slug}`, { method: 'DELETE' }),

  nearby: (lat: number, lng: number, radiusKm: number) =>
    call<VenueSummary[]>(`/venues/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}&limit=50`),
};
