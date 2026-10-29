import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard';
import { VenuesModule } from '../venues/venues.module';
import { AdminEventsController } from './admin-events.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminVenuesController } from './admin-venues.controller';
import { AdminVenuesService } from './admin-venues.service';
import { ModerationController } from './moderation.controller';
import { ReportsController } from './reports.controller';

@Module({
  imports: [VenuesModule],
  controllers: [
    AdminStatsController,
    AdminVenuesController,
    AdminEventsController,
    ModerationController,
    AdminUsersController,
    ReportsController,
  ],
  providers: [AdminVenuesService, RolesGuard],
})
export class AdminModule {}
