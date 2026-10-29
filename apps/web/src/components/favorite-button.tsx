'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { useAuth } from './auth-provider';

export function FavoriteButton({ slug }: { slug: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isFav, setIsFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return setIsFav(false);
    api
      .favorites()
      .then((list) => setIsFav(list.some((v) => v.slug === slug)))
      .catch(() => undefined);
  }, [user, slug]);

  async function toggle() {
    if (!user) return router.push(`/connexion?next=/venues/${slug}`);
    setBusy(true);
    try {
      if (isFav) await api.removeFavorite(slug);
      else await api.addFavorite(slug);
      setIsFav(!isFav);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={isFav}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        isFav
          ? 'border-pink-400/60 bg-pink-500/15 text-pink-300'
          : 'border-surface-2 text-muted hover:border-violet hover:text-ink'
      }`}
    >
      {isFav ? '♥ Dans mes favoris' : '♡ Ajouter aux favoris'}
    </button>
  );
}
