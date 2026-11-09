import { type EventItem, type Paginated, type VenueDetail, type VenueSummary } from '@tn/contracts';

/** URL absolue de l'API, utilisée par le serveur Next.js (rendu des pages). */
export const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/**
 * Le navigateur passe par le même domaine que le site : Next.js relaie /api/v1 et /media
 * vers l'API (voir next.config.ts). Le cookie de session reste ainsi « first-party »,
 * ce qui évite le blocage des cookies tiers (Safari, Firefox…) et toute config CORS.
 */
export const BROWSER_API = '/api/v1';

/** URL d'une photo à partir de sa clé de stockage (relayée par le site). */
export const media = (key: string | null | undefined) => (key ? `/media/${key}` : null);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, revalidate = 30): Promise<T> {
  // Délai court : si l'API dort, la page s'affiche tout de suite et se met à jour à son réveil
  const res = await fetch(`${API_URL}${path}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return res.json() as Promise<T>;
}

// ---- Lectures publiques (utilisées par les composants serveur) ----

export const fetchVenues = (params: Record<string, string> = {}) =>
  get<Paginated<VenueSummary>>(`/venues?${new URLSearchParams(params)}`);

export const fetchVenue = (slug: string) => get<VenueDetail>(`/venues/${encodeURIComponent(slug)}`);

export const fetchEvents = (params: Record<string, string> = {}) =>
  get<EventItem[]>(`/events?${new URLSearchParams(params)}`, 60);

export const fetchFilters = () =>
  get<{ cities: { slug: string; name: string }[]; genres: { slug: string; name: string }[] }>(
    '/filters',
    300,
  );
