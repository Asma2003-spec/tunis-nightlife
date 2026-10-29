'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  EVENT_STATUSES,
  STATUS_LABELS,
  type AdminEventRow,
  type AdminVenueRow,
  type EventStatus,
  type Paginated,
} from '@tn/contracts';
import { adminApi } from '@/lib/admin-api';
import {
  Empty,
  ErrorNote,
  Field,
  PageHeader,
  Pagination,
  StatusBadge,
  Toolbar,
  btn,
  field,
  formatDateTime,
} from '@/components/admin/ui';

const STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'PUBLISHED', label: 'Publiés' },
  { value: 'DRAFT', label: 'Brouillons' },
  { value: 'CANCELLED', label: 'Annulés' },
];

type Draft = {
  id?: string;
  venueId: string;
  title: string;
  description: string;
  startsAt: string; // "YYYY-MM-DDTHH:mm" en heure de Tunis
  endsAt: string;
  status: EventStatus;
};

/** Tunisie : UTC+1 toute l'année (pas d'heure d'été). */
const TUNIS_OFFSET = '+01:00';
const toLocalInput = (iso: string) =>
  new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
const toIso = (local: string) => `${local}:00${TUNIS_OFFSET}`;

export default function AdminEventsPage() {
  const [data, setData] = useState<Paginated<AdminEventRow> | null>(null);
  const [venues, setVenues] = useState<AdminVenueRow[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminApi
      .events({ q, status, page })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [q, status, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    adminApi
      .venues({ pageSize: 50 })
      .then((r) => setVenues(r.items))
      .catch(() => undefined);
  }, []);

  function startNew() {
    setDraft({
      venueId: venues[0]?.id ?? '',
      title: '',
      description: '',
      startsAt: '',
      endsAt: '',
      status: 'DRAFT',
    });
    setError(null);
  }

  function edit(e: AdminEventRow) {
    setDraft({
      id: e.id,
      venueId: e.venue.id,
      title: e.title,
      description: e.description,
      startsAt: toLocalInput(e.startsAt),
      endsAt: toLocalInput(e.endsAt),
      status: e.status,
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError(null);
    const body = {
      venueId: draft.venueId,
      title: draft.title,
      description: draft.description,
      startsAt: toIso(draft.startsAt),
      endsAt: toIso(draft.endsAt),
      status: draft.status,
    };
    try {
      if (draft.id) await adminApi.updateEvent(draft.id, body);
      else await adminApi.createEvent(body);
      setDraft(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(e: AdminEventRow) {
    if (!confirm(`Supprimer « ${e.title} » ?`)) return;
    await adminApi.deleteEvent(e.id).catch((err: Error) => setError(err.message));
    load();
  }

  return (
    <>
      <PageHeader
        title="Événements"
        subtitle="Soirées affichées sur les fiches et la page d’accueil (si publiées et à venir)"
        action={
          !draft && (
            <button onClick={startNew} className={btn.primary}>
              + Nouvel événement
            </button>
          )
        }
      />
      <ErrorNote error={error} />

      {draft && (
        <form onSubmit={save} className="mb-6 rounded-2xl border border-violet/40 bg-surface p-5">
          <h2 className="mb-4 font-semibold">
            {draft.id ? 'Modifier l’événement' : 'Nouvel événement'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Établissement">
              <select
                required
                value={draft.venueId}
                onChange={(e) => setDraft({ ...draft, venueId: e.target.value })}
                className={field}
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Titre">
              <input
                required
                minLength={3}
                maxLength={140}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className={field}
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                required
                minLength={10}
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className={field}
              />
            </Field>
            <Field label="Début (heure de Tunis)">
              <input
                required
                type="datetime-local"
                value={draft.startsAt}
                onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
                className={field}
              />
            </Field>
            <Field label="Fin (heure de Tunis)">
              <input
                required
                type="datetime-local"
                value={draft.endsAt}
                min={draft.startsAt}
                onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
                className={field}
              />
            </Field>
            <Field label="Statut">
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as EventStatus })}
                className={field}
              >
                {EVENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button disabled={saving} className={btn.primary}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setDraft(null)} className={btn.ghost}>
              Annuler
            </button>
          </div>
        </form>
      )}

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
        placeholder="Rechercher par titre…"
      />
      {data && data.items.length === 0 ? (
        <Empty>Aucun événement.</Empty>
      ) : (
        <div className="space-y-3">
          {data?.items.map((e) => {
            const past = new Date(e.endsAt) < new Date();
            return (
              <div
                key={e.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-surface-2 bg-surface p-4 ${
                  past ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-violet-glow uppercase">
                    {formatDateTime(e.startsAt)} {past && '· terminé'}
                  </p>
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-sm text-muted">{e.venue.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={e.status} />
                  <button onClick={() => edit(e)} className={btn.ghost}>
                    Modifier
                  </button>
                  <button onClick={() => remove(e)} className={btn.danger}>
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {data && (
        <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
      )}
    </>
  );
}
