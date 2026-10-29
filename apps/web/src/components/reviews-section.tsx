'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ReviewItem, ReviewsPage } from '@tn/contracts';
import { api } from '@/lib/client';
import { adminApi } from '@/lib/admin-api';
import { REPORT_REASONS } from '@tn/contracts';
import { useAuth } from './auth-provider';
import { Star, Stars, formatRating } from './stars';

const LABELS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Exceptionnel'];

/** Sélecteur d'étoiles interactif (souris, clavier et tactile). */
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex" role="radiogroup" aria-label="Ta note" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="p-0.5 transition hover:scale-110"
          >
            <Star fill={shown >= n ? 1 : 0} size={34} />
          </button>
        ))}
      </div>
      <span className="text-sm text-muted">{LABELS[shown]}</span>
    </div>
  );
}

/** Signaler un avis : choix d'un motif, envoyé aux modérateurs. */
function ReportButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>(REPORT_REASONS[0]);
  const [done, setDone] = useState<string | null>(null);

  async function send() {
    try {
      await adminApi.report({ targetType: 'REVIEW', targetId: reviewId, reason });
      setDone('Merci, un modérateur va examiner cet avis.');
    } catch (e) {
      setDone((e as Error).message);
    }
    setOpen(false);
  }

  if (done) return <p className="mt-2 text-xs text-muted">{done}</p>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs text-muted hover:text-pink-300">
        🚩 Signaler
      </button>
    );
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as typeof reason)}
        className="rounded-lg border border-surface-2 bg-night px-2 py-1"
        aria-label="Motif du signalement"
      >
        {REPORT_REASONS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <button onClick={send} className="rounded-lg bg-pink-500/20 px-3 py-1 text-pink-200">
        Envoyer
      </button>
      <button onClick={() => setOpen(false)} className="text-muted">
        Annuler
      </button>
    </div>
  );
}

export function ReviewsSection({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ReviewsPage | null>(null);
  const [mine, setMine] = useState<ReviewItem | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    api
      .reviews(slug)
      .then(setData)
      .catch(() => undefined);
  }, [slug]);

  useEffect(reload, [reload]);

  useEffect(() => {
    if (!user) return setMine(null);
    api
      .myReview(slug)
      .then((r) => {
        setMine(r);
        if (r) {
          setRating(r.rating);
          setComment(r.comment);
        }
      })
      .catch(() => undefined);
  }, [user, slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0)
      return setStatus({ type: 'error', text: 'Choisis une note de 1 à 5 étoiles.' });
    setSaving(true);
    setStatus(null);
    try {
      const saved = await api.saveReview(slug, { rating, comment });
      setMine(saved);
      setStatus({
        type: 'ok',
        text: mine ? 'Ton avis a été modifié.' : 'Merci ! Ton avis est publié.',
      });
      reload();
      router.refresh(); // met à jour la note moyenne en haut de la fiche
    } catch (err) {
      setStatus({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await api.deleteReview(slug);
    setMine(null);
    setRating(0);
    setComment('');
    setStatus({ type: 'ok', text: 'Ton avis a été supprimé.' });
    reload();
    router.refresh();
  }

  const max = data ? Math.max(1, ...Object.values(data.distribution)) : 1;

  return (
    <section id="avis" className="mt-12 scroll-mt-20">
      <h2 className="mb-5 text-2xl font-bold">Avis des membres</h2>

      {/* Résumé */}
      {data && data.rating.average !== null && (
        <div className="mb-8 grid gap-6 rounded-2xl border border-surface-2 bg-surface p-5 sm:grid-cols-[auto_1fr]">
          <div className="text-center sm:pr-6">
            <p className="text-5xl font-bold">{formatRating(data.rating.average)}</p>
            <Stars value={data.rating.average} size={18} />
            <p className="mt-1 text-sm text-muted">{data.rating.count} avis</p>
          </div>
          <div className="space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((n) => (
              <div key={n} className="flex items-center gap-3 text-sm">
                <span className="w-3 text-muted">{n}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-star"
                    style={{ width: `${(data.distribution[n] / max) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-muted">{data.distribution[n]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire de note */}
      <div className="mb-8 rounded-2xl border border-violet/40 bg-violet/5 p-5">
        {authLoading ? null : !user ? (
          <p className="text-muted">
            <Link
              href={`/connexion?next=/venues/${slug}`}
              className="font-semibold text-violet-glow"
            >
              Connecte-toi
            </Link>{' '}
            pour noter cet établissement.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="font-semibold">{mine ? 'Modifier ma note' : 'Donner mon avis'}</p>
            <StarInput value={rating} onChange={setRating} />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Ambiance, musique, accueil… (facultatif)"
              className="w-full rounded-xl border border-surface-2 bg-night px-3 py-2 text-sm outline-none focus:border-violet"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={saving}
                className="rounded-xl bg-violet px-5 py-2 font-semibold text-white hover:bg-violet-glow disabled:opacity-60"
              >
                {saving ? 'Envoi…' : mine ? 'Mettre à jour' : 'Publier'}
              </button>
              {mine && (
                <button
                  type="button"
                  onClick={remove}
                  className="text-sm text-muted hover:text-ink"
                >
                  Supprimer mon avis
                </button>
              )}
              {status && (
                <span
                  role="status"
                  className={`text-sm ${status.type === 'ok' ? 'text-emerald-300' : 'text-pink-300'}`}
                >
                  {status.text}
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Liste */}
      <ul className="space-y-4">
        {data?.items.map((r) => (
          <li key={r.id} className="rounded-2xl border border-surface-2 bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet/30 font-semibold">
                  {r.author.name[0]}
                </span>
                <div>
                  <p className="font-semibold">
                    {r.author.name}
                    {r.isMine && <span className="ml-2 text-xs text-violet-glow">(toi)</span>}
                  </p>
                  <Stars value={r.rating} size={14} />
                </div>
              </div>
              <time className="text-xs text-muted" dateTime={r.createdAt}>
                {new Date(r.createdAt).toLocaleDateString('fr-FR', { timeZone: 'Africa/Tunis' })}
              </time>
            </div>
            {r.comment && <p className="mt-3 text-sm text-muted">{r.comment}</p>}
            {user && !r.isMine && <ReportButton reviewId={r.id} />}
          </li>
        ))}
        {data && data.items.length === 0 && (
          <p className="text-muted">Sois le premier à donner ton avis !</p>
        )}
      </ul>
    </section>
  );
}
