'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { AdminReviewRow, Paginated } from '@tn/contracts';
import { adminApi } from '@/lib/admin-api';
import { Stars } from '@/components/stars';
import {
  Empty,
  ErrorNote,
  PageHeader,
  Pagination,
  StatusBadge,
  Toolbar,
  btn,
  formatDateTime,
} from '@/components/admin/ui';

const STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'PUBLISHED', label: 'Publiés' },
  { value: 'REJECTED', label: 'Masqués' },
  { value: 'PENDING', label: 'En attente' },
];

export default function AdminReviewsPage() {
  const [data, setData] = useState<Paginated<AdminReviewRow> | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .reviews({ q, status, page })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [q, status, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function moderate(id: string, s: 'PUBLISHED' | 'REJECTED') {
    await adminApi.moderateReview(id, s).catch((e: Error) => setError(e.message));
    load();
  }

  return (
    <>
      <PageHeader
        title="Avis"
        subtitle="Un avis masqué disparaît de la fiche et ne compte plus dans la note moyenne."
      />
      <ErrorNote error={error} />
      <Toolbar
        q={q}
        onQ={(v) => {
          setQ(v);
          setPage(1);
        }}
        status={status}
        onStatus={(v) => {
          setStatus(v);
          setPage(1);
        }}
        statuses={STATUSES}
        placeholder="Rechercher dans les commentaires…"
      />
      {data && data.items.length === 0 ? (
        <Empty>Aucun avis.</Empty>
      ) : (
        <div className="space-y-3">
          {data?.items.map((r) => (
            <article key={r.id} className="rounded-2xl border border-surface-2 bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} size={14} />
                    <Link
                      href={`/venues/${r.venue.slug}#avis`}
                      className="font-semibold hover:text-violet-glow"
                    >
                      {r.venue.name}
                    </Link>
                    <StatusBadge status={r.status} />
                    {r.openReports > 0 && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                        🚩 {r.openReports} signalement{r.openReports > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {r.author.name} · {r.author.email} · {formatDateTime(r.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.status !== 'PUBLISHED' && (
                    <button onClick={() => moderate(r.id, 'PUBLISHED')} className={btn.ghost}>
                      Publier
                    </button>
                  )}
                  {r.status !== 'REJECTED' && (
                    <button onClick={() => moderate(r.id, 'REJECTED')} className={btn.danger}>
                      Masquer
                    </button>
                  )}
                </div>
              </div>
              {r.comment ? (
                <p className="mt-3 text-sm">{r.comment}</p>
              ) : (
                <p className="mt-3 text-sm text-muted italic">Note sans commentaire</p>
              )}
            </article>
          ))}
        </div>
      )}
      {data && (
        <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
      )}
    </>
  );
}
