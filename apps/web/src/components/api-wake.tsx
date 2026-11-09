'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getApiStatus, subscribeApiStatus, waitForApi, type ApiStatus } from '@/lib/api-wake';

/**
 * Bannière affichée pendant le réveil de l'API, et nouvel essai automatique des photos
 * qui n'ont pas pu se charger pendant ce temps. Placée une seule fois dans le layout.
 */
export function ApiWakeBanner() {
  const [status, setStatus] = useState<ApiStatus>(getApiStatus);

  useEffect(() => subscribeApiStatus(setStatus), []);

  useEffect(() => {
    // Photo relayée vers l'API (/media/…) en erreur : on attend l'API puis on la recharge une fois
    function onError(e: Event) {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.wakeRetry) return;
      const src = img.getAttribute('src') ?? '';
      if (!src.startsWith('/media/')) return;
      img.dataset.wakeRetry = '1';
      void waitForApi().then((ok) => {
        if (ok) img.src = `${src}${src.includes('?') ? '&' : '?'}r=${Date.now()}`;
      });
    }
    window.addEventListener('error', onError, true); // les erreurs d'images ne remontent pas
    return () => window.removeEventListener('error', onError, true);
  }, []);

  if (status === 'ok') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg rounded-2xl border border-violet/40 bg-surface/95 px-4 py-3 text-sm shadow-2xl backdrop-blur sm:inset-x-6"
    >
      {status === 'waking' ? (
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-violet border-t-transparent"
          />
          <p>
            <span className="font-semibold">Le serveur démarre…</span>{' '}
            <span className="text-muted">
              L’hébergement gratuit se met en veille sans visite : le réveil prend environ une
              minute. La page se met à jour toute seule.
            </span>
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-pink-300">Le serveur ne répond toujours pas.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="shrink-0 rounded-xl bg-violet px-3 py-1.5 font-semibold text-white"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * À afficher quand une page n'a pas pu charger ses données côté serveur : attend le réveil de
 * l'API puis recharge la page automatiquement. `children` sert d'aperçu pendant l'attente.
 */
export function ApiWaking({ children }: { children?: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void waitForApi().then((ok) => {
      if (ok && active) router.refresh();
    });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <>
      {children ?? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-surface">
              <div className="aspect-[3/2] bg-surface-2/60" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 rounded bg-surface-2/60" />
                <div className="h-3 w-1/3 rounded bg-surface-2/60" />
              </div>
            </div>
          ))}
        </div>
      )}
      <span className="sr-only">Chargement : le serveur démarre</span>
    </>
  );
}
