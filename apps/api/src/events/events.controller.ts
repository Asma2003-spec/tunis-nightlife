import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EventListQuerySchema, type EventItem, type EventListQuery } from '@tn/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Événements publiés à venir (ou en cours)' })
  @ApiQuery({ name: 'venue', required: false, description: "Slug d'établissement" })
  @ApiQuery({ name: 'city', required: false, description: 'Slug de ville' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Query(new ZodValidationPipe(EventListQuerySchema)) q: EventListQuery,
  ): Promise<EventItem[]> {
    const events = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        endsAt: { gte: new Date() },
        venue: {
          status: 'PUBLISHED',
          ...(q.venue ? { slug: q.venue } : {}),
          ...(q.city ? { city: { slug: q.city } } : {}),
        },
      },
      orderBy: { startsAt: 'asc' },
      take: q.limit,
      include: {
        venue: {
          select: {
            slug: true,
            name: true,
            city: { select: { name: true } },
            photos: { orderBy: { position: 'asc' }, take: 1, select: { storageKey: true } },
          },
        },
      },
    });

    return events.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      description: e.description,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      coverKey: e.coverKey,
      venue: {
        slug: e.venue.slug,
        name: e.venue.name,
        city: e.venue.city.name,
        coverPhotoKey: e.venue.photos[0]?.storageKey ?? null,
      },
    }));
  }
}
