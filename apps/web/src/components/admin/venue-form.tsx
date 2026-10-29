'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  PRICE_LABELS,
  PRICE_RANGES,
  STATUS_LABELS,
  TUNISIA_BOUNDS,
  VENUE_STATUSES,
  VENUE_TYPES,
  VENUE_TYPE_LABELS,
  WEEKDAYS_FR,
  type AdminVenueDetail,
  type VenueUpsertInput,
} from '@tn/contracts';
import { adminApi } from '@/lib/admin-api';
import { ErrorNote, Field, btn, field } from './ui';
import { PhotoManager } from './photo-manager';

const LocationPicker = dynamic(() => import('./location-picker-inner'), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-xl bg-night" />,
});

type Meta = { cities: { slug: string; name: string }[]; genres: { slug: string; name: string }[] };
type Slot = { open: boolean; opensAt: string; closesAt: string };

const toTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const DAYS = [1, 2, 3, 4, 5, 6, 0];

const EMPTY: VenueUpsertInput = {
  name: '',
  description: '',
  type: 'NIGHTCLUB',
  citySlug: 'tunis',
  address: '',
  latitude: 36.8065,
  longitude: 10.1815,
  priceRange: 'MODERATE',
  phone: '',
  website: '',
  instagram: '',
  status: 'DRAFT',
  isDemo: false,
  genreSlugs: [],
  openingHours: [],
};

export function VenueForm({
  venue,
  onSaved,
}: {
  venue?: AdminVenueDetail;
  onSaved?: (v: AdminVenueDetail) => void;
}) {
  const router = useRouter();
  const [meta, setMeta] = useState<Meta>({ cities: [], genres: [] });
  const [form, setForm] = useState<VenueUpsertInput>(() =>
    venue
      ? {
          ...EMPTY,
          ...venue,
          phone: venue.phone ?? '',
          website: venue.website ?? '',
          instagram: venue.instagram ?? '',
        }
      : EMPTY,
  );
  // Un créneau par jour dans l'éditeur (le cas le plus courant)
  const [slots, setSlots] = useState<Record<number, Slot>>(() =>
    Object.fromEntries(
      DAYS.map((d) => {
        const s = venue?.openingHours.find((h) => h.weekday === d);
        return [
          d,
          s
            ? { open: true, opensAt: toTime(s.opensAt), closesAt: toTime(s.closesAt) }
            : { open: false, opensAt: '23:00', closesAt: '05:00' },
        ];
      }),
    ),
  );
  const [markVerified, setMarkVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi
      .meta()
      .then(setMeta)
      .catch(() => undefined);
  }, []);

  const set = <K extends keyof VenueUpsertInput>(key: K, value: VenueUpsertInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body: VenueUpsertInput = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      markVerified,
      openingHours: DAYS.filter((d) => slots[d]!.open).map((d) => ({
        weekday: d,
        opensAt: toMinutes(slots[d]!.opensAt),
        closesAt: toMinutes(slots[d]!.closesAt),
      })),
    };
    try {
      if (venue) {
        onSaved?.(await adminApi.updateVenue(venue.id, body));
        setSaved(true);
        setMarkVerified(false);
        router.refresh();
      } else {
        const created = await adminApi.createVenue(body);
        // Ensuite : ajout des photos sur la page de modification
        router.replace(`/admin/etablissements/${created.id}?nouveau=1`);
      }
    } catch (err) {
      setError((err as Error).message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  const section = 'rounded-2xl border border-surface-2 bg-surface p-5';

  return (
    <form onSubmit={submit} className="space-y-6">
      <ErrorNote error={error} />

      <section className={section}>
        <h2 className="mb-4 font-semibold">Informations</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom *" className="sm:col-span-2">
            <input
              required
              minLength={2}
              maxLength={120}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={field}
            />
          </Field>
          <Field label="Description *" hint="20 caractères minimum" className="sm:col-span-2">
            <textarea
              required
              minLength={20}
              maxLength={4000}
              rows={4}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={field}
            />
          </Field>
          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value as never)}
              className={field}
            >
              {VENUE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {VENUE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gamme de prix">
            <select
              value={form.priceRange}
              onChange={(e) => set('priceRange', e.target.value as never)}
              className={field}
            >
              {PRICE_RANGES.map((p) => (
                <option key={p} value={p}>
                  {PRICE_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Téléphone">
            <input
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
              className={field}
              placeholder="+216 …"
            />
          </Field>
          <Field label="Instagram">
            <input
              value={form.instagram ?? ''}
              onChange={(e) => set('instagram', e.target.value)}
              className={field}
              placeholder="@compte"
            />
          </Field>
          <Field label="Site web" className="sm:col-span-2">
            <input
              type="url"
              value={form.website ?? ''}
              onChange={(e) => set('website', e.target.value)}
              className={field}
              placeholder="https://…"
            />
          </Field>
        </div>

        <p className="mt-5 mb-2 text-sm text-muted">Musiques</p>
        <div className="flex flex-wrap gap-2">
          {meta.genres.map((g) => {
            const on = form.genreSlugs.includes(g.slug);
            return (
              <button
                key={g.slug}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set(
                    'genreSlugs',
                    on ? form.genreSlugs.filter((s) => s !== g.slug) : [...form.genreSlugs, g.slug],
                  )
                }
                className={`rounded-full px-3 py-1 text-sm ${
                  on ? 'bg-violet text-white' : 'bg-surface-2 text-muted hover:text-ink'
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className={section}>
        <h2 className="mb-4 font-semibold">Localisation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville">
            <select
              value={form.citySlug}
              onChange={(e) => set('citySlug', e.target.value)}
              className={field}
            >
              {meta.cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Adresse *">
            <input
              required
              minLength={5}
              maxLength={255}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className={field}
            />
          </Field>
        </div>
        <p className="mt-4 mb-2 text-sm text-muted">
          Clique sur la carte ou fais glisser le point pour placer l’établissement.
        </p>
        <LocationPicker
          lat={Number(form.latitude)}
          lng={Number(form.longitude)}
          onChange={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
        />
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <input
              type="number"
              step="0.000001"
              min={TUNISIA_BOUNDS.minLat}
              max={TUNISIA_BOUNDS.maxLat}
              value={form.latitude}
              onChange={(e) => set('latitude', Number(e.target.value))}
              className={field}
            />
          </Field>
          <Field label="Longitude">
            <input
              type="number"
              step="0.000001"
              min={TUNISIA_BOUNDS.minLng}
              max={TUNISIA_BOUNDS.maxLng}
              value={form.longitude}
              onChange={(e) => set('longitude', Number(e.target.value))}
              className={field}
            />
          </Field>
        </div>
      </section>

      <section className={section}>
        <h2 className="mb-1 font-semibold">Horaires</h2>
        <p className="mb-4 text-sm text-muted">
          Heure de Tunis. Une fermeture plus tôt que l’ouverture signifie le lendemain (ex. 23:00 →
          05:00).
        </p>
        <div className="space-y-2">
          {DAYS.map((d) => {
            const s = slots[d]!;
            const update = (patch: Partial<Slot>) =>
              setSlots((all) => ({ ...all, [d]: { ...s, ...patch } }));
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex w-32 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.open}
                    onChange={(e) => update({ open: e.target.checked })}
                    className="accent-violet"
                  />
                  {WEEKDAYS_FR[d]}
                </label>
                {s.open ? (
                  <>
                    <input
                      type="time"
                      value={s.opensAt}
                      onChange={(e) => update({ opensAt: e.target.value })}
                      className={field.replace('w-full', 'w-32')}
                    />
                    <span className="text-muted">→</span>
                    <input
                      type="time"
                      value={s.closesAt}
                      onChange={(e) => update({ closesAt: e.target.value })}
                      className={field.replace('w-full', 'w-32')}
                    />
                  </>
                ) : (
                  <span className="text-muted">Fermé</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {venue && <PhotoManager venueId={venue.id} initial={venue.photos} />}

      <section className={section}>
        <h2 className="mb-4 font-semibold">Publication</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Statut" hint="Seuls les établissements « Publié » sont visibles du public.">
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as never)}
              className={field}
            >
              {VENUE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <div className="space-y-3 pt-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isDemo}
                onChange={(e) => set('isDemo', e.target.checked)}
                className="accent-violet"
              />
              Établissement fictif (badge « Démo »)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={markVerified}
                onChange={(e) => setMarkVerified(e.target.checked)}
                className="accent-violet"
              />
              J’ai vérifié ces informations aujourd’hui
            </label>
            {venue?.lastVerifiedAt && (
              <p className="text-xs text-muted">
                Dernière vérification : {new Date(venue.lastVerifiedAt).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="sticky bottom-4 flex items-center gap-3 rounded-2xl border border-surface-2 bg-night/90 p-3 backdrop-blur">
        <button disabled={saving} className={btn.primary}>
          {saving
            ? 'Enregistrement…'
            : venue
              ? 'Enregistrer les modifications'
              : 'Créer l’établissement'}
        </button>
        {saved && (
          <span role="status" className="text-sm text-emerald-300">
            ✓ Enregistré
          </span>
        )}
        {!venue && (
          <span className="text-sm text-muted">Les photos s’ajoutent juste après la création.</span>
        )}
      </div>
    </form>
  );
}
