import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AdminListQuerySchema,
  EventUpsertSchema,
  type AdminEventRow,
  type AdminListQuery,
  type EventStatus,
  type Paginated,
} from '@tn/contracts';
import type { z } from 'zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { uniqueSlug } from './slug';

type EventUpsert = z.infer<typeof EventUpsertSchema>;
const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminEventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Tous les événements (les plus récents en premier)' })
  async list(
    @Query(new ZodValidationPipe(AdminListQuerySchema)) q: AdminListQuery,
  ): Promise<Paginated<AdminEventRow>> {
    const where = {
      ...(q.q ? { title: { contains: q.q, mode: 'insensitive' as const } } : {}),
      ...(q.status ? { status: q.status as EventStatus } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { venue: { select: { id: true, name: true } } },
      }),
      this.prisma.event.count({ where }),
    ]);
    return {
      items: rows.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt.toISOString(),
        status: e.status,
        venue: e.venue,
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Créer un événement' })
  async create(@Body(new ZodValidationPipe(EventUpsertSchema)) body: EventUpsert) {
    await this.ensureVenue(body.venueId);
    const slug = await uniqueSlug(`${body.title}-${body.startsAt.slice(0, 10)}`, async (s) =>
      Boolean(await this.prisma.event.findUnique({ where: { slug: s }, select: { id: true } })),
    );
    return this.prisma.event.create({ data: { ...this.data(body), slug } });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un événement' })
  async update(
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(EventUpsertSchema)) body: EventUpsert,
  ) {
    await this.ensureEvent(id);
    await this.ensureVenue(body.venueId);
    return this.prisma.event.update({ where: { id }, data: this.data(body) });
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer un événement' })
  async remove(@Param('id', uuid) id: string) {
    await this.ensureEvent(id);
    await this.prisma.event.delete({ where: { id } });
  }

  private data(body: EventUpsert) {
    return {
      venueId: body.venueId,
      title: body.title,
      description: body.description,
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      status: body.status,
    };
  }

  private async ensureVenue(id: string) {
    const v = await this.prisma.venue.findUnique({ where: { id }, select: { id: true } });
    if (!v) throw new NotFoundException('Établissement introuvable');
  }

  private async ensureEvent(id: string) {
    const e = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!e) throw new NotFoundException('Événement introuvable');
  }
}
