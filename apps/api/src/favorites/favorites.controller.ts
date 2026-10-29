import { Controller, Delete, Get, HttpCode, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { VenuesService } from '../venues/venues.service';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('me/favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venues: VenuesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Mes établissements favoris' })
  async list(@CurrentUser() user: AuthUser) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: user.id, venue: { status: 'PUBLISHED' } },
      orderBy: { createdAt: 'desc' },
      select: { venueId: true },
    });
    return this.venues.summariesByIds(favorites.map((f) => f.venueId));
  }

  @Put(':slug')
  @HttpCode(204)
  @ApiOperation({ summary: 'Ajouter aux favoris' })
  async add(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    const venueId = await this.venues.publishedIdBySlug(slug);
    await this.prisma.favorite.upsert({
      where: { userId_venueId: { userId: user.id, venueId } },
      create: { userId: user.id, venueId },
      update: {},
    });
  }

  @Delete(':slug')
  @HttpCode(204)
  @ApiOperation({ summary: 'Retirer des favoris' })
  async remove(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    const venueId = await this.venues.publishedIdBySlug(slug);
    await this.prisma.favorite.deleteMany({ where: { userId: user.id, venueId } });
  }
}
