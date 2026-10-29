import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AdminListQuerySchema,
  ReportDecisionSchema,
  ReviewModerationSchema,
  type AdminListQuery,
  type AdminReportRow,
  type AdminReviewRow,
  type Paginated,
  type ReportStatus,
  type ReviewStatus,
} from '@tn/contracts';
import type { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Modération : accessible aux modérateurs et aux administrateurs. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MODERATOR', 'ADMIN')
export class ModerationController {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Avis ----------------

  @Get('reviews')
  @ApiOperation({ summary: 'Avis à modérer (filtre par statut)' })
  async reviews(
    @Query(new ZodValidationPipe(AdminListQuerySchema)) q: AdminListQuery,
  ): Promise<Paginated<AdminReviewRow>> {
    const where = {
      ...(q.status ? { status: q.status as ReviewStatus } : {}),
      ...(q.q ? { comment: { contains: q.q, mode: 'insensitive' as const } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
          venue: { select: { slug: true, name: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    const reportCounts = await this.prisma.report.groupBy({
      by: ['targetId'],
      where: { targetType: 'REVIEW', status: 'OPEN', targetId: { in: rows.map((r) => r.id) } },
      _count: { _all: true },
    });
    const counts = new Map(reportCounts.map((c) => [c.targetId, c._count._all]));
    return {
      items: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        author: r.user,
        venue: r.venue,
        openReports: counts.get(r.id) ?? 0,
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  }

  @Patch('reviews/:id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Publier ou masquer un avis (un avis masqué ne compte plus dans la moyenne)',
  })
  async moderateReview(
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(ReviewModerationSchema))
    body: z.infer<typeof ReviewModerationSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    const review = await this.prisma.review.findUnique({ where: { id }, select: { id: true } });
    if (!review) throw new NotFoundException('Avis introuvable');
    await this.prisma.review.update({
      where: { id },
      data: { status: body.status, moderatedById: user.id, moderatedAt: new Date() },
    });
  }

  // ---------------- Signalements ----------------

  @Get('reports')
  @ApiOperation({ summary: 'Signalements (les plus récents en premier)' })
  async reports(
    @Query(new ZodValidationPipe(AdminListQuerySchema)) q: AdminListQuery,
  ): Promise<Paginated<AdminReportRow>> {
    const where = q.status ? { status: q.status as ReportStatus } : {};
    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          reporter: { select: { name: true, email: true } },
          handledBy: { select: { name: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    // Résumé de chaque cible (requêtes groupées par type)
    const ids = (t: string) => rows.filter((r) => r.targetType === t).map((r) => r.targetId);
    const [reviews, venues, events] = await Promise.all([
      this.prisma.review.findMany({
        where: { id: { in: ids('REVIEW') } },
        select: {
          id: true,
          comment: true,
          rating: true,
          status: true,
          venue: { select: { slug: true, name: true } },
        },
      }),
      this.prisma.venue.findMany({
        where: { id: { in: ids('VENUE') } },
        select: { id: true, slug: true, name: true, status: true },
      }),
      this.prisma.event.findMany({
        where: { id: { in: ids('EVENT') } },
        select: { id: true, title: true, status: true, venue: { select: { slug: true } } },
      }),
    ]);
    const targets = new Map<string, AdminReportRow['target']>([
      ...reviews.map(
        (r) =>
          [
            r.id,
            {
              label: `Avis ${r.rating}★ sur ${r.venue.name}`,
              excerpt: r.comment.slice(0, 200),
              venueSlug: r.venue.slug,
              status: r.status,
            },
          ] as const,
      ),
      ...venues.map((v) => [v.id, { label: v.name, venueSlug: v.slug, status: v.status }] as const),
      ...events.map(
        (e) => [e.id, { label: e.title, venueSlug: e.venue.slug, status: e.status }] as const,
      ),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reporter: r.reporter,
        handledBy: r.handledBy,
        target: targets.get(r.targetId) ?? null,
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  }

  @Patch('reports/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Traiter un signalement (et masquer l’avis visé si demandé)' })
  async decide(
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(ReportDecisionSchema)) body: z.infer<typeof ReportDecisionSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Signalement introuvable');

    await this.prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id },
        data: { status: body.status, handledById: user.id, handledAt: new Date() },
      });
      if (body.hideTarget && body.status === 'RESOLVED' && report.targetType === 'REVIEW') {
        await tx.review.updateMany({
          where: { id: report.targetId },
          data: { status: 'REJECTED', moderatedById: user.id, moderatedAt: new Date() },
        });
        // Les autres signalements ouverts sur le même avis sont clos avec lui
        await tx.report.updateMany({
          where: { targetType: 'REVIEW', targetId: report.targetId, status: 'OPEN' },
          data: { status: 'RESOLVED', handledById: user.id, handledAt: new Date() },
        });
      }
    });
  }
}
