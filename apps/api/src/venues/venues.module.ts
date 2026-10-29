import { Module } from '@nestjs/common';
import { EventsController } from '../events/events.controller';
import { FavoritesController } from '../favorites/favorites.controller';
import { ReviewsController } from '../reviews/reviews.controller';
import { ReviewsService } from '../reviews/reviews.service';
import { FiltersController } from './filters.controller';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  controllers: [
    VenuesController,
    FiltersController,
    ReviewsController,
    FavoritesController,
    EventsController,
  ],
  providers: [VenuesService, ReviewsService],
  exports: [VenuesService],
})
export class VenuesModule {}
