import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AdminListQuerySchema,
  VENUE_STATUSES,
  VenueUpsertSchema,
  type AdminListQuery,
} from '@tn/contracts';
import { z } from 'zod';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import type { AuthUser } from '../auth/auth.types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminVenuesService } from './admin-venues.service';
import { MAX_PHOTO_BYTES } from './image-validation';

const StatusSchema = z.object({ status: z.enum(VENUE_STATUSES) });
const ReorderSchema = z.object({ photoIds: z.array(z.uuid()).max(20) });
const uuid = new ParseUUIDPipe({ version: '4' });

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/venues')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminVenuesController {
  constructor(private readonly service: AdminVenuesService) {}

  // Déclarée avant ':id'
  @Get('meta')
  @ApiOperation({ summary: 'Toutes les villes et tous les genres (formulaires)' })
  meta() {
    return this.service.meta();
  }

  @Get()
  @ApiOperation({ summary: 'Tous les établissements, quel que soit leur statut' })
  list(@Query(new ZodValidationPipe(AdminListQuerySchema)) q: AdminListQuery) {
    return this.service.list(q);
  }

  @Get(':id')
  get(@Param('id', uuid) id: string) {
    return this.service.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un établissement' })
  create(
    @Body(new ZodValidationPipe(VenueUpsertSchema)) body: z.infer<typeof VenueUpsertSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(body, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un établissement (remplace horaires et genres)' })
  update(
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(VenueUpsertSchema)) body: z.infer<typeof VenueUpsertSchema>,
  ) {
    return this.service.update(id, body);
  }

  @Patch(':id/status')
  @HttpCode(204)
  @ApiOperation({ summary: 'Publier, suspendre ou repasser en brouillon' })
  setStatus(
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(StatusSchema)) body: z.infer<typeof StatusSchema>,
  ) {
    return this.service.setStatus(id, body.status);
  }

  @Post(':id/photos')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Ajouter une photo (JPEG, PNG ou WebP, 5 Mo max)' })
  // Taille limitée dès la réception : un fichier trop gros est rejeté avant d'être lu en entier
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } }))
  addPhoto(
    @Param('id', uuid) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('altText') altText = '',
  ) {
    return this.service.addPhoto(id, file, String(altText));
  }

  @Put(':id/photos/order')
  @HttpCode(204)
  @ApiOperation({ summary: 'Réordonner les photos (la première est la couverture)' })
  reorder(
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(ReorderSchema)) body: z.infer<typeof ReorderSchema>,
  ) {
    return this.service.reorderPhotos(id, body.photoIds);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(204)
  deletePhoto(@Param('id', uuid) id: string, @Param('photoId', uuid) photoId: string) {
    return this.service.deletePhoto(id, photoId);
  }
}
