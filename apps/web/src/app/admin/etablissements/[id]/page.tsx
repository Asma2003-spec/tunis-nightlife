'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { AdminVenueDetail } from '@tn/contracts';
import { adminApi } from '@/lib/admin-api';
import { BackLink, ErrorNote, PageHeader, StatusBadge } from '@/components/admin/ui';
import { VenueForm } from '@/components/admin/venue-form';

function EditVenue() {
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get('nouveau') === '1';
  const [venue, setVenue] = useState<AdminVenueDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .venue(id)
      .then(setVenue)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  return (
    <>
      <BackLink href="/admin/etablissements">Établissements</BackLink>
      <ErrorNote error={error} />
      {venue && (
        <>
          <PageHeader
            title={venue.name}
            subtitle={`/${venue.slug}`}
            action={
              <div className="flex items-center gap-3">
                <StatusBadge status={venue.status} />
                {venue.status === 'PUBLISHED' && (
                  <Link href={`/venues/${venue.slug}`} className="text-sm text-violet-glow">
                    Voir la fiche publique →
                  </Link>
                )}
              </div>
            }
          />
          {created && (
            <p className="mb-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              ✓ Établissement créé. Ajoute maintenant ses photos, puis passe son statut à « Publié
              ».
            </p>
          )}
          <VenueForm key={venue.id} venue={venue} onSaved={setVenue} />
        </>
      )}
    </>
  );
}

export default function EditVenuePage() {
  return (
    <Suspense>
      <EditVenue />
    </Suspense>
  );
}
