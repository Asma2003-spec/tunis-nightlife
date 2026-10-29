'use client';

import { useMemo, useState } from 'react';
import type { VenueSummary } from '@tn/contracts';
import { api } from '@/lib/client';
import { VenueMap } from '@/components/map/venue-map';
import { VenueCard } from '@/components/venue-card';

const RADII = [2, 5, 10, 25, 50];

type Position = { latitude: number; longitude: number };

export function NearbyExplorer({ venues, focus }: { venues: VenueSummary[]; focus?: string }) {
  const [position, setPosition] = useState<Position | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [nearby, setNearby] = useState<VenueSummary[] | null>(null);
  const [state, setState] = useState<'idle' | 'locating' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function search(pos: Position, radius: number) {
    setNearby(await api.nearby(pos.latitude, pos.longitude, radius));
  }

  /** Position demandée uniquement après un clic, jamais en arrière-plan. */
  function locate() {
    if (!('geolocation' in navigator)) {
      setState('error');
      return setMessage('La géolocalisation n’est pas disponible sur ce navigateur.');
    }
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const pos = { latitude: p.coords.latitude, longitude: p.coords.longitude };
        setPosition(pos);
        setState('idle');
        await search(pos, radiusKm).catch(() => setMessage('Recherche impossible.'));
      },
      (err) => {
        setState('error');
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Autorisation refusée. Active la localisation pour ce site dans ton navigateur.'
            : 'Position introuvable. Réessaie ou utilise la position de démonstration.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  /** Utile pour tester hors de Tunisie : position fixe au centre de La Marsa. */
  function applyDemoPosition() {
    const pos = { latitude: 36.8782, longitude: 10.3247 };
    setPosition(pos);
    setState('idle');
    setMessage('Position de démonstration : La Marsa.');
    search(pos, radiusKm).catch(() => undefined);
  }

  function changeRadius(r: number) {
    setRadiusKm(r);
    if (position) search(position, r).catch(() => undefined);
  }

  const shown = nearby ?? venues;
  const points = useMemo(
    () =>
      shown.map((v) => ({
        slug: v.slug,
        name: v.name,
        latitude: v.latitude,
        longitude: v.longitude,
        subtitle:
          v.distanceKm !== undefined
            ? `${String(v.distanceKm).replace('.', ',')} km · ${v.city.name}`
            : v.city.name,
      })),
    [shown],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="pt-8 pb-6">
        <h1 className="text-3xl font-bold">Autour de moi</h1>
        <p className="mt-2 text-muted">
          Autorise la localisation pour voir les établissements les plus proches et leur distance.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={locate}
          disabled={state === 'locating'}
          className="rounded-full bg-violet px-5 py-2.5 font-semibold text-white hover:bg-violet-glow disabled:opacity-60"
        >
          {state === 'locating'
            ? 'Localisation…'
            : position
              ? '📍 Actualiser ma position'
              : '📍 Me localiser'}
        </button>
        <button
          onClick={applyDemoPosition}
          className="text-sm text-muted underline-offset-2 hover:underline"
        >
          Utiliser une position de démo
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          Rayon
          <select
            value={radiusKm}
            onChange={(e) => changeRadius(Number(e.target.value))}
            className="rounded-lg border border-surface-2 bg-surface px-2 py-1.5 text-ink"
          >
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && (
        <p
          role="status"
          className={`mb-4 text-sm ${state === 'error' ? 'text-pink-300' : 'text-muted'}`}
        >
          {message}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-surface-2">
        <VenueMap
          points={points}
          user={position}
          radiusKm={position ? radiusKm : undefined}
          height={460}
          highlightSlug={focus}
        />
      </div>

      <h2 className="mt-10 mb-4 text-xl font-bold">
        {nearby
          ? nearby.length
            ? `${nearby.length} établissement${nearby.length > 1 ? 's' : ''} à moins de ${radiusKm} km`
            : `Aucun établissement à moins de ${radiusKm} km — augmente le rayon.`
          : 'Tous les établissements'}
      </h2>
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((v) => (
          <VenueCard key={v.id} venue={v} />
        ))}
      </section>
    </main>
  );
}
