'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { AdminReportRow, Paginated } from '@tn/contracts';
import { adminApi } from '@/lib/admin-api';
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
  { value: 'OPEN', label: 'À traiter' },
  { value: 'RESOLVED', label: 'Traités' },
  { value: 'DISMISSED', label: 'Classés' },
  { value: '', label: 'Tous' },
];

const TARGET_LABELS = { REVIEW: 'Avis', VENUE: 'Établissement', EVENT: 'Événement' } as const;

export default function AdminReportsPage() {
  const [data, setData] = useState<Paginated<AdminReportRow> | null>(null);
  const [status, setStatus] = useState('OPEN');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .reports({ status, page })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [status, page]);

  useEffect(load, [load]);

  async function decide(r: AdminReportRow, s: 'RESOLVED' | 'DISMISSED', hide = false) {
    setBusy(r.id);
    await adminApi.decideReport(r.id, s, hide).catch((e: Error) => setError(e.message));
    setBusy(null);
    load();
  }

  return (
    <>
      <PageHeader title="Signalements" subtitle="Contenus signalés par les membres" />
      <ErrorNote error={error} />
      <Toolbar
        status={status}
        onStatus={(v) => {
          setStatus(v);
          setPage(1);
        }}
        statuses={STATUSES}
      />
      {data && data.items.length === 0 ? (
        <Empty>
          {status === 'OPEN' ? '🎉 Aucun signalement en attente.' : 'Aucun signalement.'}
        </Empty>
      ) : (
        <div className="space-y-3">
          {data?.items.map((r) => (
            <article key={r.id} className="rounded-2xl border border-surface-2 bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">
                  {TARGET_LABELS[r.targetType]}
                </span>
                <span className="font-semibold">{r.reason}</span>
                <StatusBadge status={r.status} />
                <span className="text-xs text-muted">
                  par {r.reporter.name} · {formatDateTime(r.createdAt)}
                </span>
              </div>
              {r.details && <p className="mt-2 text-sm text-muted">« {r.details} »</p>}

              <div className="mt-3 rounded-xl bg-night p-3 text-sm">
                {r.target ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.target.label}</span>
                      {r.target.status && <StatusBadge status={r.target.status} />}
                      {r.target.venueSlug && (
                        <Link
                          href={`/venues/${r.target.venueSlug}`}
                          className="text-xs text-violet-glow"
                        >
                          Voir la fiche →
                        </Link>
                      )}
                    </div>
                    {r.target.excerpt !== undefined && (
                      <p className="mt-1 text-muted">
                        {r.target.excerpt || <em>Note sans commentaire</em>}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-muted">Contenu supprimé depuis le signalement.</span>
                )}
              </div>

              {r.status === 'OPEN' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.targetType === 'REVIEW' && r.target?.status !== 'REJECTED' && (
                    <button
                      disabled={busy === r.id}
                      onClick={() => decide(r, 'RESOLVED', true)}
                      className={btn.danger}
                    >
                      Masquer l’avis et clore
                    </button>
                  )}
                  <button
                    disabled={busy === r.id}
                    onClick={() => decide(r, 'RESOLVED')}
                    className={btn.ghost}
                  >
                    Marquer comme traité
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => decide(r, 'DISMISSED')}
                    className={btn.ghost}
                  >
                    Classer sans suite
                  </button>
                </div>
              ) : (
                r.handledBy && (
                  <p className="mt-3 text-xs text-muted">Traité par {r.handledBy.name}</p>
                )
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
