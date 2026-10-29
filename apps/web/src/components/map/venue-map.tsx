'use client';

import dynamic from 'next/dynamic';

export type MapPoint = {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  subtitle?: string;
};

export type VenueMapProps = {
  points: MapPoint[];
  user?: { latitude: number; longitude: number } | null;
  radiusKm?: number;
  height?: number;
  highlightSlug?: string;
};

// Leaflet utilise `window` : la carte est rendue uniquement dans le navigateur
const Inner = dynamic(() => import('./venue-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl bg-surface text-muted">
      Chargement de la carte…
    </div>
  ),
});

export function VenueMap(props: VenueMapProps) {
  return <Inner {...props} />;
}
