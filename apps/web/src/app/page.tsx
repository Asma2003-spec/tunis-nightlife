import Link from 'next/link';
import { VENUE_TYPES, VENUE_TYPE_LABELS } from '@tn/contracts';
import { fetchEvents, fetchFilters, fetchVenues, media } from '@/lib/api';
import { VenueCard } from '@/components/venue-card';
import { EventDate } from '@/components/event-date';
import { ApiWaking } from '@/components/api-wake';

export const dynamic = 'force-dynamic';

type Search = { q?: string; city?: string; type?: string; genre?: string; sort?: string };

const selectClass =
  'rounded-xl border border-surface-2 bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-violet';

export default async function HomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const params: Record<string, string> = { pageSize: '24', sort: sp.sort ?? 'rating' };
  for (const k of ['q', 'city', 'type', 'genre'] as const) if (sp[k]) params[k] = sp[k]!;

  const [result, filters, events] = await Promise.all([
    fetchVenues(params).catch(() => null),
    fetchFilters().catch(() => ({ cities: [], genres: [] })),
    fetchEvents({ limit: '6' }).catch(() => []),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="pt-10 pb-8">
        <p className="text-sm font-medium tracking-widest text-violet-glow uppercase">
          Grand Tunis
        </p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">
          Les meilleures sorties,{' '}
          <span className="bg-gradient-to-r from-violet to-violet-glow bg-clip-text text-transparent">
            notées pour de vrai
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          Boîtes de nuit, lounges et rooftops : notes des membres, carte, horaires et événements.
        </p>
        <Link
          href="/carte"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-violet px-5 py-2.5 font-semibold text-white shadow-[0_0_30px_-6px] shadow-violet transition hover:bg-violet-glow"
        >
          📍 Trouver autour de moi
        </Link>
      </header>

      {/* Filtres : simple formulaire GET, fonctionne même sans JavaScript */}
      <form className="mb-8 grid gap-3 rounded-2xl border border-surface-2 bg-surface/60 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Rechercher un établissement…"
          className={`${selectClass} lg:col-span-2`}
        />
        <select name="city" defaultValue={sp.city ?? ''} className={selectClass}>
          <option value="">Toutes les villes</option>
          {filters.cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={sp.type ?? ''} className={selectClass}>
          <option value="">Tous les types</option>
          {VENUE_TYPES.map((t) => (
            <option key={t} value={t}>
              {VENUE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select name="genre" defaultValue={sp.genre ?? ''} className={selectClass}>
          <option value="">Toutes les musiques</option>
          {filters.genres.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            name="sort"
            defaultValue={sp.sort ?? 'rating'}
            className={`${selectClass} flex-1`}
          >
            <option value="rating">Mieux notés</option>
            <option value="name">A → Z</option>
            <option value="newest">Nouveautés</option>
          </select>
          <button className="rounded-xl bg-violet px-4 text-sm font-semibold text-white hover:bg-violet-glow">
            OK
          </button>
        </div>
      </form>

      {result === null ? (
        <ApiWaking />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            {result.total} établissement{result.total > 1 ? 's' : ''}
          </p>
          {result.items.length === 0 ? (
            <p className="rounded-xl bg-surface p-6 text-muted">
              Aucun résultat.{' '}
              <Link href="/" className="text-violet-glow">
                Réinitialiser les filtres
              </Link>
            </p>
          ) : (
            <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </section>
          )}
        </>
      )}

      {events.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-2xl font-bold">Soirées à venir</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <Link
                key={e.id}
                href={`/venues/${e.venue.slug}`}
                className="flex gap-4 rounded-2xl border border-surface-2 bg-surface p-3 hover:border-violet/60"
              >
                {media(e.venue.coverPhotoKey) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media(e.venue.coverPhotoKey)!}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-violet-glow uppercase">
                    <EventDate iso={e.startsAt} />
                  </p>
                  <p className="truncate font-semibold">{e.title}</p>
                  <p className="truncate text-sm text-muted">
                    {e.venue.name} · {e.venue.city}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-xs text-muted">
        Les établissements marqués « Démo » sont fictifs et servent uniquement à la démonstration.
      </p>
    </main>
  );
}
