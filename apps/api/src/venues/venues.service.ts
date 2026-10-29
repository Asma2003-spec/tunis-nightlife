import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Paginated,
  RatingSummary,
  VenueDetail,
  VenueListQuery,
  VenueNearbyQuery,
  VenueSummary,
} from '@tn/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Champs nécessaires pour construire un VenueSummary. */
const summaryInclude = {
  city: { select: { slug: true, name: true } },
  photos: { orderBy: { position: 'asc' }, take: 1, select: { storageKey: true } },
} satisfies Prisma.VenueInclude;

type VenueWithSummary = Prisma.VenueGetPayload<{ include: typeof summaryInclude }>;

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Liste paginée et filtrée des établissements publiés. */
  async list(query: VenueListQuery): Promise<Paginated<VenueSummary>> {
    const where: Prisma.Sql[] = [Prisma.sql`v.status = 'PUBLISHED'`];
    if (query.q) where.push(Prisma.sql`v.name ILIKE ${'%' + query.q + '%'}`);
    if (query.city) where.push(Prisma.sql`c.slug = ${query.city}`);
    if (query.type) where.push(Prisma.sql`v.type = ${query.type}::"VenueType"`);
    if (query.priceRange) where.push(Prisma.sql`v.price_range = ${query.priceRange}::"PriceRange"`);
    if (query.genre) {
      where.push(Prisma.sql`EXISTS (
        SELECT 1 FROM venue_genres vg JOIN music_genres g ON g.id = vg.genre_id
        WHERE vg.venue_id = v.id AND g.slug = ${query.genre})`);
    }
    const having =
      query.minRating !== undefined
        ? Prisma.sql`WHERE COALESCE(f.avg, 0) >= ${query.minRating}`
        : Prisma.empty;

    // Tri explicite : jamais de tri dicté directement par une chaîne du client
    const orderBy = {
      rating: Prisma.sql`f.avg DESC NULLS LAST, f.count DESC, f.name ASC`,
      name: Prisma.sql`f.name ASC`,
      newest: Prisma.sql`f.created_at DESC`,
    }[query.sort];

    const base = Prisma.sql`
      FROM venues v
      JOIN cities c ON c.id = v.city_id
      LEFT JOIN (
        SELECT venue_id, AVG(rating)::float AS avg, COUNT(*)::int AS count
        FROM reviews WHERE status = 'PUBLISHED' GROUP BY venue_id
      ) r ON r.venue_id = v.id
    `;
    const filtered = Prisma.sql`SELECT v.id, r.avg, COALESCE(r.count, 0) AS count, v.name, v.created_at
      ${base}
      WHERE ${Prisma.join(where, ' AND ')}`;

    const [rows, totals] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT f.id FROM (${filtered}) AS f
        ${having}
        ORDER BY ${orderBy}
        LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total FROM (${filtered}) AS f
        ${having}`,
    ]);

    const items = await this.summariesByIds(rows.map((r) => r.id));
    return { items, page: query.page, pageSize: query.pageSize, total: totals[0]?.total ?? 0 };
  }

  /** Établissements publiés dans un rayon donné, triés par distance (PostGIS + index GiST). */
  async nearby(query: VenueNearbyQuery): Promise<VenueSummary[]> {
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography`;
    const rows = await this.prisma.$queryRaw<{ id: string; distance_m: number }[]>`
      SELECT id, ST_Distance(location, ${point}) AS distance_m
      FROM venues
      WHERE status = 'PUBLISHED' AND ST_DWithin(location, ${point}, ${query.radiusKm * 1000})
      ORDER BY distance_m ASC
      LIMIT ${query.limit}`;

    const distances = new Map(rows.map((r) => [r.id, r.distance_m]));
    const items = await this.summariesByIds(rows.map((r) => r.id));
    return items.map((v) => ({
      ...v,
      distanceKm: Math.round((distances.get(v.id) ?? 0) / 10) / 100,
    }));
  }

  /** Fiche détaillée d'un établissement publié. */
  async findBySlug(slug: string): Promise<VenueDetail> {
    const venue = await this.prisma.venue.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        city: { select: { slug: true, name: true } },
        photos: {
          orderBy: { position: 'asc' },
          select: { storageKey: true, altText: true, position: true },
        },
        openingHours: { orderBy: [{ weekday: 'asc' }, { opensAt: 'asc' }] },
        genres: { include: { genre: { select: { slug: true, name: true } } } },
      },
    });
    if (!venue) throw new NotFoundException('Établissement introuvable');

    const rating = (await this.ratings([venue.id])).get(venue.id) ?? { average: null, count: 0 };
    return {
      ...this.toSummary({ ...venue, photos: venue.photos.slice(0, 1) }, rating),
      description: venue.description,
      address: venue.address,
      phone: venue.phone,
      website: venue.website,
      instagram: venue.instagram,
      genres: venue.genres.map((g) => g.genre),
      photos: venue.photos,
      openingHours: venue.openingHours.map(({ weekday, opensAt, closesAt }) => ({
        weekday,
        opensAt,
        closesAt,
      })),
      lastVerifiedAt: venue.lastVerifiedAt?.toISOString() ?? null,
    };
  }

  /** Identifiant d'un établissement publié (404 sinon). */
  async publishedIdBySlug(slug: string): Promise<string> {
    const venue = await this.prisma.venue.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!venue) throw new NotFoundException('Établissement introuvable');
    return venue.id;
  }

  // ------------------------------------------------------------------

  /** Charge les établissements dans l'ordre des identifiants fournis. */
  async summariesByIds(ids: string[]): Promise<VenueSummary[]> {
    if (ids.length === 0) return [];
    const [venues, ratings] = await Promise.all([
      this.prisma.venue.findMany({ where: { id: { in: ids } }, include: summaryInclude }),
      this.ratings(ids),
    ]);
    const byId = new Map(venues.map((v) => [v.id, v]));
    return ids
      .map((id) => byId.get(id))
      .filter((v): v is VenueWithSummary => v !== undefined)
      .map((v) => this.toSummary(v, ratings.get(v.id) ?? { average: null, count: 0 }));
  }

  /** Moyenne calculée uniquement sur les avis PUBLISHED, jamais saisie à la main. */
  async ratings(venueIds: string[]): Promise<Map<string, RatingSummary>> {
    const groups = await this.prisma.review.groupBy({
      by: ['venueId'],
      where: { venueId: { in: venueIds }, status: 'PUBLISHED' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return new Map(
      groups.map((g) => [
        g.venueId,
        {
          average: g._avg.rating === null ? null : Math.round(g._avg.rating * 10) / 10,
          count: g._count._all,
        },
      ]),
    );
  }

  private toSummary(v: VenueWithSummary, rating: RatingSummary): VenueSummary {
    return {
      id: v.id,
      slug: v.slug,
      name: v.name,
      type: v.type,
      city: v.city,
      priceRange: v.priceRange,
      latitude: v.latitude,
      longitude: v.longitude,
      coverPhotoKey: v.photos[0]?.storageKey ?? null,
      rating,
      isDemo: v.isDemo,
    };
  }
}
