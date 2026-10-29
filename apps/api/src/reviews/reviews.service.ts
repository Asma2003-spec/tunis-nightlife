import { Injectable } from '@nestjs/common';
import type { ReviewItem, ReviewsPage } from '@tn/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { VenuesService } from '../venues/venues.service';

/** Affiche "Prénom N." pour ne pas exposer le nom complet des utilisateurs. */
function displayName(name: string): string {
  const [first, ...rest] = name
    .replace(/\s*\(démo\)\s*$/i, '')
    .trim()
    .split(/\s+/);
  const initial = rest.length ? ` ${rest[rest.length - 1]![0]!.toUpperCase()}.` : '';
  return `${first ?? 'Utilisateur'}${initial}`;
}

type ReviewRow = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  userId: string;
  user: { name: string };
};

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venues: VenuesService,
  ) {}

  /** Avis publiés d'un établissement, du plus récent au plus ancien. */
  async list(slug: string, page: number, pageSize: number, userId?: string): Promise<ReviewsPage> {
    const venueId = await this.venues.publishedIdBySlug(slug);
    const where = { venueId, status: 'PUBLISHED' as const };

    const [rows, total, ratings, groups] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { name: true } } },
      }),
      this.prisma.review.count({ where }),
      this.venues.ratings([venueId]),
      this.prisma.review.groupBy({ by: ['rating'], where, _count: { _all: true } }),
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewsPage['distribution'];
    for (const g of groups) distribution[g.rating as 1 | 2 | 3 | 4 | 5] = g._count._all;

    return {
      items: rows.map((r) => this.toItem(r, userId)),
      page,
      pageSize,
      total,
      rating: ratings.get(venueId) ?? { average: null, count: 0 },
      distribution,
    };
  }

  async mine(slug: string, userId: string): Promise<ReviewItem | null> {
    const venueId = await this.venues.publishedIdBySlug(slug);
    const review = await this.prisma.review.findUnique({
      where: { userId_venueId: { userId, venueId } },
      include: { user: { select: { name: true } } },
    });
    return review ? this.toItem(review, userId) : null;
  }

  /**
   * Crée ou met à jour l'avis de l'utilisateur (un seul avis par établissement).
   * Publication immédiate, avec modération a posteriori : un modérateur peut masquer
   * un avis signalé (statut REJECTED), il ne compte alors plus dans la moyenne.
   */
  async upsert(slug: string, userId: string, rating: number, comment: string): Promise<ReviewItem> {
    const venueId = await this.venues.publishedIdBySlug(slug);
    const review = await this.prisma.review.upsert({
      where: { userId_venueId: { userId, venueId } },
      create: { userId, venueId, rating, comment, status: 'PUBLISHED' },
      update: { rating, comment, status: 'PUBLISHED', moderatedAt: null, moderatedById: null },
      include: { user: { select: { name: true } } },
    });
    return this.toItem(review, userId);
  }

  async remove(slug: string, userId: string): Promise<void> {
    const venueId = await this.venues.publishedIdBySlug(slug);
    await this.prisma.review.deleteMany({ where: { userId, venueId } });
  }

  private toItem(r: ReviewRow, userId?: string): ReviewItem {
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      author: { name: displayName(r.user.name) },
      isMine: userId !== undefined && r.userId === userId,
    };
  }
}
