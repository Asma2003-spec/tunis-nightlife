import {
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateReportSchema } from '@tn/contracts';
import type { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

/** Signalement par un membre connecté (avis, établissement ou événement). */
@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Signaler un contenu' })
  async create(
    @Body(new ZodValidationPipe(CreateReportSchema)) body: z.infer<typeof CreateReportSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    // La cible doit exister (la relation est polymorphe, donc vérifiée ici)
    const exists =
      body.targetType === 'REVIEW'
        ? await this.prisma.review.findUnique({
            where: { id: body.targetId },
            select: { id: true },
          })
        : body.targetType === 'VENUE'
          ? await this.prisma.venue.findUnique({
              where: { id: body.targetId },
              select: { id: true },
            })
          : await this.prisma.event.findUnique({
              where: { id: body.targetId },
              select: { id: true },
            });
    if (!exists) throw new NotFoundException('Contenu introuvable');

    // Un seul signalement ouvert par personne et par contenu
    const duplicate = await this.prisma.report.findFirst({
      where: {
        reporterId: user.id,
        targetType: body.targetType,
        targetId: body.targetId,
        status: 'OPEN',
      },
      select: { id: true },
    });
    if (duplicate)
      throw new ConflictException('Tu as déjà signalé ce contenu, il est en cours d’examen');

    await this.prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: body.targetType,
        targetId: body.targetId,
        reason: body.reason,
        details: body.details || null,
      },
    });
    return { ok: true };
  }
}
