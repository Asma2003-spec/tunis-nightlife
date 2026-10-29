import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  PRICE_LABELS,
  VENUE_TYPE_LABELS,
  WEEKDAYS_FR,
  formatMinutes,
  isOpenNow,
} from '@tn/contracts';
import { ApiError, fetchEvents, fetchVenue, media } from '@/lib/api';
import { Stars, formatRating } from '@/components/stars';
import { EventDate } from '@/components/event-date';
import { VenueMap } from '@/components/map/venue-map';
import { directionsUrl } from '@/lib/geo';
import { FavoriteButton } from '@/components/favorite-button';
import { ReviewsSection } from '@/components/reviews-section';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return await fetchVenue(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const venue = await load((await params).slug);
  return { title: `${venue.name} — Tunis Nightlife`, description: venue.description };
}

export default async function VenuePage({ params }: Params) {
  const { slug } = await params;
  const [venue, events] = await Promise.all([
    load(slug),
    fetchEvents({ venue: slug, limit: '5' }).catch(() => []),
  ]);
  const open = isOpenNow(venue.openingHours);
  const photos = venue.photos.map((p) => ({ ...p, url: media(p.storageKey)! }));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <Link href="/" className="mt-6 inline-block text-sm text-muted hover:text-ink">
        ← Tous les établissements
      </Link>

      {/* Galerie : carrousel horizontal sur mobile, mosaïque sur grand écran */}
      <section className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:grid-rows-2 sm:overflow-visible sm:px-0">
        {photos.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.storageKey}
            src={p.url}
            alt={p.altText}
            className={`aspect-[3/2] w-[85%] shrink-0 snap-center rounded-2xl object-cover sm:w-full ${
              i === 0 ? 'sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:h-full' : ''
            }`}
          />
        ))}
      </section>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-violet-glow">
                {VENUE_TYPE_LABELS[venue.type]} · {venue.city.name}
              </p>
              <h1 className="mt-1 text-4xl font-bold">{venue.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {venue.rating.average !== null ? (
                  <>
                    <Stars value={venue.rating.average} size={18} />
                    <span className="font-semibold">{formatRating(venue.rating.average)}</span>
                    <a href="#avis" className="text-muted underline-offset-2 hover:underline">
                      {venue.rating.count} avis
                    </a>
                  </>
                ) : (
                  <span className="text-muted">Pas encore d’avis</span>
                )}
                <span className="text-muted">· {PRICE_LABELS[venue.priceRange]}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    open ? 'bg-emerald-500/15 text-emerald-300' : 'bg-surface-2 text-muted'
                  }`}
                >
                  {open ? '● Ouvert maintenant' : 'Fermé'}
                </span>
                {venue.isDemo && (
                  <span className="rounded-full border border-violet-glow/40 px-2 py-0.5 text-xs text-violet-glow">
                    Démo
                  </span>
                )}
              </div>
            </div>
            <FavoriteButton slug={venue.slug} />
          </div>

          <p className="mt-6 leading-relaxed text-muted">{venue.description}</p>

          {venue.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {venue.genres.map((g) => (
                <Link
                  key={g.slug}
                  href={`/?genre=${g.slug}`}
                  className="rounded-full bg-surface-2 px-3 py-1 text-sm hover:bg-violet/30"
                >
                  {g.name}
                </Link>
              ))}
            </div>
          )}

          {events.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 text-xl font-bold">Prochaines soirées</h2>
              <ul className="space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="rounded-xl border border-surface-2 bg-surface p-4">
                    <p className="text-xs font-semibold text-violet-glow uppercase">
                      <EventDate iso={e.startsAt} />
                    </p>
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-sm text-muted">{e.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ReviewsSection slug={venue.slug} />
        </div>

        {/* Colonne pratique */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-surface-2">
            <VenueMap
              points={[
                {
                  slug: venue.slug,
                  name: venue.name,
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                  subtitle: venue.address,
                },
              ]}
              highlightSlug={venue.slug}
              height={240}
            />
          </div>
          <div className="rounded-2xl border border-surface-2 bg-surface p-5">
            <p className="text-sm text-muted">Adresse</p>
            <p className="mt-1">{venue.address}</p>
            <a
              href={directionsUrl(venue)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-violet py-2.5 font-semibold text-white hover:bg-violet-glow"
            >
              🧭 Itinéraire
            </a>
            <Link
              href={`/carte?focus=${venue.slug}`}
              className="mt-2 block text-center text-sm text-muted hover:text-ink"
            >
              Voir sur la carte avec les lieux proches
            </Link>
          </div>

          <div className="rounded-2xl border border-surface-2 bg-surface p-5">
            <p className="mb-3 font-semibold">Horaires</p>
            <ul className="space-y-1.5 text-sm">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const slots = venue.openingHours.filter((h) => h.weekday === d);
                return (
                  <li key={d} className="flex justify-between gap-4">
                    <span className="text-muted">{WEEKDAYS_FR[d]}</span>
                    <span>
                      {slots.length === 0
                        ? 'Fermé'
                        : slots
                            .map(
                              (s) => `${formatMinutes(s.opensAt)} – ${formatMinutes(s.closesAt)}`,
                            )
                            .join(', ')}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
