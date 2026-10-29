'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { VENUE_TYPE_LABELS, type AdminVenueRow, type Paginated } from '@tn/contracts';
import { adminApi } from '@/lib/admin-api';
import {
  Empty,
  ErrorNote,
  PageHeader,
  Pagination,
  StatusBadge,
  Toolbar,
  btn,
} from '@/components/admin/ui';

const STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'PUBLISHED', label: 'Publiés' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'SUSPENDED', label: 'Suspendus' },
];

export default function AdminVenuesPage() {
  const [data, setData] = useState<Paginated<AdminVenueRow> | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .venues({ q, status, page })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [q, status, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <>
      <PageHeader
        title="Établissements"
        subtitle={data ? `${data.total} au total` : undefined}
        action={
          <Link href="/admin/etablissements/nouveau" className={btn.primary}>
            + Nouvel établissement
          </Link>
        }
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
        placeholder="Rechercher par nom…"
      />
      {data && data.items.length === 0 ? (
        <Empty>Aucun établissement.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Type · Ville</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Photos</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-2">
              {data?.items.map((v) => (
                <tr key={v.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3 font-medium">
                    {v.name}
                    {v.isDemo && <span className="ml-2 text-xs text-violet-glow">démo</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {VENUE_TYPE_LABELS[v.type]} · {v.city}
                  </td>
                  <td className="px-4 py-3">
                    {v.rating.average === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <>
                        <span className="text-star">★</span>{' '}
                        {v.rating.average.toFixed(1).replace('.', ',')}{' '}
                        <span className="text-muted">({v.rating.count})</span>
                      </>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 ${v.photoCount === 0 ? 'text-pink-300' : 'text-muted'}`}
                  >
                    {v.photoCount}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {v.status === 'PUBLISHED' && (
                      <Link href={`/venues/${v.slug}`} className="mr-3 text-muted hover:text-ink">
                        Voir
                      </Link>
                    )}
                    <Link href={`/admin/etablissements/${v.id}`} className="text-violet-glow">
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && (
        <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
      )}
    </>
  );
}
