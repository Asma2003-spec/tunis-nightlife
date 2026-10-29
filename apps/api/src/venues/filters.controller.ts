import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('venues')
@Controller('filters')
export class FiltersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Villes et genres musicaux disponibles pour les filtres' })
  async list() {
    const [cities, genres] = await Promise.all([
      this.prisma.city.findMany({
        where: { venues: { some: { status: 'PUBLISHED' } } },
        orderBy: { name: 'asc' },
        select: { slug: true, name: true, nameAr: true },
      }),
      this.prisma.musicGenre.findMany({
        orderBy: { name: 'asc' },
        select: { slug: true, name: true },
      }),
    ]);
    return { cities, genres };
  }
}
