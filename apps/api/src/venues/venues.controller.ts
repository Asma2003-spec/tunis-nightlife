import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  NEARBY_MAX_RADIUS_KM,
  PAGE_SIZE_MAX,
  VENUE_TYPES,
  PRICE_RANGES,
  VenueListQuerySchema,
  VenueNearbyQuerySchema,
  type VenueListQuery,
  type VenueNearbyQuery,
} from '@tn/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { VenuesService } from './venues.service';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister et filtrer les établissements publiés' })
  @ApiQuery({ name: 'q', required: false, description: 'Recherche par nom' })
  @ApiQuery({ name: 'city', required: false, description: 'Slug de ville (ex. la-marsa)' })
  @ApiQuery({ name: 'type', required: false, enum: VENUE_TYPES })
  @ApiQuery({ name: 'priceRange', required: false, enum: PRICE_RANGES })
  @ApiQuery({ name: 'genre', required: false, description: 'Slug de genre musical (ex. techno)' })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['rating', 'name', 'newest'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: `Max ${PAGE_SIZE_MAX}`,
  })
  list(@Query(new ZodValidationPipe(VenueListQuerySchema)) query: VenueListQuery) {
    return this.venues.list(query);
  }

  // Déclarée avant ':slug' pour ne pas être capturée par la route paramétrée
  @Get('nearby')
  @ApiOperation({ summary: 'Établissements proches d’une position (PostGIS)' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  @ApiQuery({
    name: 'radiusKm',
    required: false,
    type: Number,
    description: `Max ${NEARBY_MAX_RADIUS_KM}`,
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  nearby(@Query(new ZodValidationPipe(VenueNearbyQuerySchema)) query: VenueNearbyQuery) {
    return this.venues.nearby(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Fiche détaillée d’un établissement publié' })
  findOne(@Param('slug') slug: string) {
    return this.venues.findBySlug(slug);
  }
}
