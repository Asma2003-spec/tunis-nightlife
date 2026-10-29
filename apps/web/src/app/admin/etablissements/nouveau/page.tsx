'use client';

import { BackLink, PageHeader } from '@/components/admin/ui';
import { VenueForm } from '@/components/admin/venue-form';

export default function NewVenuePage() {
  return (
    <>
      <BackLink href="/admin/etablissements">Établissements</BackLink>
      <PageHeader
        title="Nouvel établissement"
        subtitle="Créé en brouillon par défaut, invisible du public."
      />
      <VenueForm />
    </>
  );
}
