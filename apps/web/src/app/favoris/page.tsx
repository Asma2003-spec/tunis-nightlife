'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { VenueSummary } from '@tn/contracts';
import { api } from '@/lib/client';
import { useAuth } from '@/components/auth-provider';
import { VenueCard } from '@/components/venue-card';

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<VenueSummary[] | null>(null);

  useEffect(() => {
    if (user)
      api
        .favorites()
        .then(setItems)
        .catch(() => setItems([]));
  }, [user]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <h1 className="pt-8 pb-6 text-3xl font-bold">Mes favoris</h1>
      {loading ? null : !user ? (
        <p className="text-muted">
          <Link href="/connexion?next=/favoris" className="font-semibold text-violet-glow">
            Connecte-toi
          </Link>{' '}
          pour retrouver tes établissements favoris.
        </p>
      ) : items === null ? (
        <p className="text-muted">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">
          Aucun favori pour l’instant. Ouvre une fiche et clique sur « ♡ Ajouter aux favoris ».
        </p>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </section>
      )}
    </main>
  );
}
