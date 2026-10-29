import {
  mediaUrl,
  type EventItem,
  type Paginated,
  type VenueDetail,
  type VenueSummary,
} from '@tn/contracts';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** URL publique d'une photo à partir de sa clé de stockage. */
export const media = (key: string | null | undefined) => mediaUrl(API_URL, key);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, revalidate = 30): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
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
