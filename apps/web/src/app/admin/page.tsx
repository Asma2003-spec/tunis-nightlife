'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AdminStats } from '@tn/contracts';
import { adminApi } from '@/lib/admin-api';
import { useAuth } from '@/components/auth-provider';
import { ErrorNote, PageHeader } from '@/components/admin/ui';

function Kpi({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="h-full rounded-2xl border border-surface-2 bg-surface p-5 transition hover:border-violet/50">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .stats()
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const max = stats ? Math.max(1, ...stats.reviewsPerDay.map((d) => d.count)) : 1;

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Vue d’ensemble de la plateforme" />
      <ErrorNote error={error} />
      {!stats ? (
        !error && <p className="text-muted">Chargement…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Établissements publiés"
              value={stats.venues.PUBLISHED}
              hint={`${stats.venues.DRAFT} brouillon(s) · ${stats.venues.SUSPENDED} suspendu(s)`}
              href={isAdmin ? '/admin/etablissements' : undefined}
            />
            <Kpi
              label="Avis publiés"
              value={stats.reviews}
              hint={`+${stats.reviews7d} cette semaine · moyenne ${
                stats.averageRating?.toFixed(1).replace('.', ',') ?? '—'
              } ★`}
              href="/admin/avis"
            />
            <Kpi
              label="Signalements à traiter"
              value={stats.openReports}
              hint={stats.openReports ? 'À examiner en priorité' : 'Rien en attente'}
              href="/admin/signalements"
            />
            <Kpi
              label="Membres"
              value={stats.users}
              hint={`+${stats.newUsers7d} cette semaine · ${stats.upcomingEvents} événement(s) à venir`}
              href={isAdmin ? '/admin/utilisateurs' : undefined}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <section className="rounded-2xl border border-surface-2 bg-surface p-5">
              <h2 className="font-semibold">Avis publiés — 14 derniers jours</h2>
              <div
                className="mt-6 flex h-48 items-end gap-1.5"
                role="img"
                aria-label="Histogramme des avis par jour"
              >
                {stats.reviewsPerDay.map((d) => (
                  <div key={d.date} className="group flex h-full flex-1 flex-col justify-end">
                    <div
                      className="rounded-t-md bg-violet transition group-hover:bg-violet-glow"
                      style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 1 }}
                      title={`${d.date} : ${d.count} avis`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{stats.reviewsPerDay[0]?.date.slice(5).split('-').reverse().join('/')}</span>
                <span>Aujourd’hui</span>
              </div>
            </section>

            <section className="rounded-2xl border border-surface-2 bg-surface p-5">
              <h2 className="mb-4 font-semibold">Les mieux notés</h2>
              <ol className="space-y-3">
                {stats.topVenues.map((v, i) => (
                  <li key={v.slug} className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`/venues/${v.slug}`} className="truncate hover:text-violet-glow">
                      <span className="mr-2 text-muted">{i + 1}.</span>
                      {v.name}
                    </Link>
                    <span className="shrink-0 text-muted">
                      <span className="text-star">★</span> {v.average.toFixed(1).replace('.', ',')}{' '}
                      ({v.count})
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
