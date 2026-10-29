import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReviewSchema, PaginationQuerySchema, type CreateReviewInput } from '@tn/contracts';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard, OptionalAuth } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ReviewsService } from './reviews.service';

type Pagination = z.infer<typeof PaginationQuerySchema>;

@ApiTags('reviews')
@Controller('venues/:slug/reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: 'Avis publiés, moyenne et répartition des notes' })
  list(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(PaginationQuerySchema)) q: Pagination,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.reviews.list(slug, q.page, q.pageSize, user?.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mon avis sur cet établissement' })
  mine(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.reviews.mine(slug, user.id);
  }

  @Put('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Noter cet établissement (crée ou modifie mon avis)' })
  @ApiBody({ schema: { example: { rating: 4, comment: 'Super ambiance !' } } })
  upsert(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(CreateReviewSchema)) body: CreateReviewInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reviews.upsert(slug, user.id, body.rating, body.comment ?? '');
  }

  @Delete('me')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer mon avis' })
  remove(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.reviews.remove(slug, user.id);
  }
}
