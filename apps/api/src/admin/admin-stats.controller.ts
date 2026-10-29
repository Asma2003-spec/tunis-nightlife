import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VENUE_STATUSES, type AdminStats, type VenueStatus } from '@tn/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 24 * 60 * 60 * 1000;

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MODERATOR', 'ADMIN')
export class AdminStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Indicateurs du tableau de bord' })
  async stats(): Promise<AdminStats> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY);
    const twoWeeksAgo = new Date(now.getTime() - 14 * DAY);
    const published = { status: 'PUBLISHED' as const };

    const [byStatus, users, newUsers, reviews, reviews7d, avg, openReports, upcoming, top, perDay] =
      await Promise.all([
        this.prisma.venue.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
        this.prisma.review.count({ where: published }),
        this.prisma.review.count({ where: { ...published, createdAt: { gte: weekAgo } } }),
        this.prisma.review.aggregate({ where: published, _avg: { rating: true } }),
        this.prisma.report.count({ where: { status: 'OPEN' } }),
        this.prisma.event.count({ where: { ...published, endsAt: { gte: now } } }),
        this.prisma.$queryRaw<{ slug: string; name: string; average: number; count: number }[]>`
          SELECT v.slug, v.name, ROUND(AVG(r.rating)::numeric, 1)::float AS average, COUNT(*)::int AS count
          FROM reviews r JOIN venues v ON v.id = r.venue_id
          WHERE r.status = 'PUBLISHED' AND v.status = 'PUBLISHED'
          GROUP BY v.id HAVING COUNT(*) >= 2
          ORDER BY average DESC, count DESC LIMIT 5`,
        this.prisma.$queryRaw<{ date: string; count: number }[]>`
          SELECT to_char(d, 'YYYY-MM-DD') AS date, COUNT(r.id)::int AS count
          FROM generate_series(
            (now() AT TIME ZONE 'Africa/Tunis')::date - 13,
            (now() AT TIME ZONE 'Africa/Tunis')::date, interval '1 day') AS d
          LEFT JOIN reviews r ON r.status = 'PUBLISHED'
            AND (r.created_at AT TIME ZONE 'Africa/Tunis')::date = d::date
            AND r.created_at >= ${twoWeeksAgo}
          GROUP BY d ORDER BY d`,
      ]);

    const venues = Object.fromEntries(VENUE_STATUSES.map((s) => [s, 0])) as Record<
      VenueStatus,
      number
    >;
    for (const g of byStatus) venues[g.status] = g._count._all;

    return {
      venues,
      users,
      newUsers7d: newUsers,
      reviews,
      reviews7d,
      averageRating: avg._avg.rating === null ? null : Math.round(avg._avg.rating * 10) / 10,
      openReports,
      upcomingEvents: upcoming,
      topVenues: top,
      reviewsPerDay: perDay,
    };
  }
}
