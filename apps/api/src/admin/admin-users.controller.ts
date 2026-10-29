import {
  BadRequestException,
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
  RoleChangeSchema,
  type AdminListQuery,
  type AdminUserRow,
  type Paginated,
  type UserRole,
} from '@tn/contracts';
import type { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Utilisateurs (recherche par nom ou email, filtre par rôle)' })
  async list(
    @Query(new ZodValidationPipe(AdminListQuerySchema)) q: AdminListQuery,
  ): Promise<Paginated<AdminUserRow>> {
    const where = {
      deletedAt: null,
      ...(q.status ? { role: q.status as UserRole } : {}),
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' as const } },
              { email: { contains: q.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { reviews: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        reviewCount: u._count.reviews,
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  }

  @Patch(':id/role')
  @HttpCode(204)
  @ApiOperation({ summary: 'Changer le rôle d’un utilisateur' })
  async setRole(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(RoleChangeSchema)) body: z.infer<typeof RoleChangeSchema>,
    @CurrentUser() me: AuthUser,
  ) {
    // Évite qu'un administrateur se retire ses propres droits par erreur
    if (id === me.id) throw new BadRequestException('Tu ne peux pas modifier ton propre rôle');
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    await this.prisma.user.update({ where: { id }, data: { role: body.role } });
  }
}
