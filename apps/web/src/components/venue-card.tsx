import Link from 'next/link';
import { PRICE_LABELS, VENUE_TYPE_LABELS, type VenueSummary } from '@tn/contracts';
import { media } from '@/lib/api';
import { Stars, formatRating } from './stars';

export function VenueCard({ venue }: { venue: VenueSummary }) {
  const { average, count } = venue.rating;
  const cover = media(venue.coverPhotoKey);

  return (
    <Link
      href={`/venues/${venue.slug}`}
      className="group block overflow-hidden rounded-2xl border border-surface-2 bg-surface transition hover:-translate-y-0.5 hover:border-violet/60 hover:shadow-[0_0_40px_-10px] hover:shadow-violet/50"
    >
      <div className="relative aspect-[3/2] overflow-hidden bg-surface-2">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={venue.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent" />
        {venue.isDemo && (
          <span className="absolute top-3 right-3 rounded-full bg-night/70 px-2 py-0.5 text-xs text-violet-glow backdrop-blur">
            Démo
          </span>
        )}
        {venue.distanceKm !== undefined && (
          <span className="absolute top-3 left-3 rounded-full bg-violet px-2 py-0.5 text-xs font-semibold text-white">
            {venue.distanceKm.toString().replace('.', ',')} km
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-ink">{venue.name}</h3>
        <p className="text-sm text-muted">
          {VENUE_TYPE_LABELS[venue.type]} · {venue.city.name} · {PRICE_LABELS[venue.priceRange]}
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm">
          {average === null ? (
            <span className="text-muted">Pas encore d’avis</span>
          ) : (
            <>
              <Stars value={average} />
              <span className="font-semibold">{formatRating(average)}</span>
              <span className="text-muted">({count} avis)</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
