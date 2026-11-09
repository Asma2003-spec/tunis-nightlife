import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminListQuery,
  AdminVenueDetail,
  AdminVenueRow,
  Paginated,
  VenueStatus,
} from '@tn/contracts';
import { VenueUpsertSchema } from '@tn/contracts';
import type { z } from 'zod';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VenuesService } from '../venues/venues.service';
import { MAX_PHOTOS_PER_VENUE, MAX_PHOTO_BYTES, detectImageType } from './image-validation';
import { uniqueSlug } from './slug';

type VenueUpsert = z.infer<typeof VenueUpsertSchema>;

@Injectable()
export class AdminVenuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venues: VenuesService,
  ) {}

  async list(q: AdminListQuery): Promise<Paginated<AdminVenueRow>> {
    const where: Prisma.VenueWhereInput = {
      ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
      ...(q.status ? { status: q.status as VenueStatus } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { city: { select: { name: true } }, _count: { select: { photos: true } } },
      }),
      this.prisma.venue.count({ where }),
    ]);
    const ratings = await this.venues.ratings(rows.map((r) => r.id));
    return {
      items: rows.map((v) => ({
        id: v.id,
        slug: v.slug,
        name: v.name,
        type: v.type,
        city: v.city.name,
        status: v.status,
        isDemo: v.isDemo,
        rating: ratings.get(v.id) ?? { average: null, count: 0 },
        photoCount: v._count.photos,
        updatedAt: v.updatedAt.toISOString(),
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  }

  async meta() {
    const [cities, genres] = await Promise.all([
      this.prisma.city.findMany({ orderBy: { name: 'asc' }, select: { slug: true, name: true } }),
      this.prisma.musicGenre.findMany({
        orderBy: { name: 'asc' },
        select: { slug: true, name: true },
      }),
    ]);
    return { cities, genres };
  }

  async get(id: string): Promise<AdminVenueDetail> {
    const v = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        city: { select: { slug: true } },
        genres: { include: { genre: { select: { slug: true } } } },
        openingHours: { orderBy: [{ weekday: 'asc' }, { opensAt: 'asc' }] },
        photos: { orderBy: { position: 'asc' } },
      },
    });
    if (!v) throw new NotFoundException('Établissement introuvable');
    return {
      id: v.id,
      slug: v.slug,
      name: v.name,
      description: v.description,
      type: v.type,
      citySlug: v.city.slug,
      address: v.address,
      latitude: v.latitude,
      longitude: v.longitude,
      priceRange: v.priceRange,
      phone: v.phone,
      website: v.website,
      instagram: v.instagram,
      status: v.status,
      isDemo: v.isDemo,
      lastVerifiedAt: v.lastVerifiedAt?.toISOString() ?? null,
      genreSlugs: v.genres.map((g) => g.genre.slug),
      openingHours: v.openingHours.map(({ weekday, opensAt, closesAt }) => ({
        weekday,
        opensAt,
        closesAt,
      })),
      photos: v.photos.map(({ id, storageKey, altText, position }) => ({
        id,
        storageKey,
        altText,
        position,
      })),
    };
  }

  async create(input: VenueUpsert, userId: string): Promise<AdminVenueDetail> {
    const cityId = await this.cityId(input.citySlug);
    const genreIds = await this.genreIds(input.genreSlugs);
    const slug = await uniqueSlug(input.name, async (s) =>
      Boolean(await this.prisma.venue.findUnique({ where: { slug: s }, select: { id: true } })),
    );
    const venue = await this.prisma.venue.create({
      data: {
        ...this.fields(input),
        slug,
        cityId,
        createdById: userId,
        genres: { create: genreIds.map((genreId) => ({ genreId })) },
        openingHours: { create: input.openingHours },
      },
    });
    return this.get(venue.id);
  }

  async update(id: string, input: VenueUpsert): Promise<AdminVenueDetail> {
    await this.ensure(id);
    const cityId = await this.cityId(input.citySlug);
    const genreIds = await this.genreIds(input.genreSlugs);
    // Horaires et genres remplacés dans une même transaction
    await this.prisma.$transaction([
      this.prisma.venueGenre.deleteMany({ where: { venueId: id } }),
      this.prisma.openingHours.deleteMany({ where: { venueId: id } }),
      this.prisma.venue.update({
        where: { id },
        data: {
          ...this.fields(input),
          cityId,
          genres: { create: genreIds.map((genreId) => ({ genreId })) },
          openingHours: { create: input.openingHours },
        },
      }),
    ]);
    return this.get(id);
  }

  async setStatus(id: string, status: VenueStatus) {
    await this.ensure(id);
    await this.prisma.venue.update({ where: { id }, data: { status } });
  }

  // ---------------- Photos ----------------

  async addPhoto(id: string, file: Express.Multer.File | undefined, altText: string) {
    if (!file) throw new BadRequestException('Aucun fichier reçu (champ "photo")');
    if (file.size > MAX_PHOTO_BYTES)
      throw new BadRequestException('Image trop lourde (5 Mo maximum)');
    const ext = detectImageType(file.buffer);
    if (!ext) throw new BadRequestException('Format non accepté : JPEG, PNG ou WebP uniquement');

    const venue = await this.prisma.venue.findUnique({
      where: { id },
      select: { name: true, photos: { select: { position: true } } },
    });
    if (!venue) throw new NotFoundException('Établissement introuvable');
    if (venue.photos.length >= MAX_PHOTOS_PER_VENUE) {
      throw new BadRequestException(`${MAX_PHOTOS_PER_VENUE} photos maximum par établissement`);
    }

    // Nom généré par le serveur (jamais celui du client). Le fichier est stocké en base :
    // il survit aux redémarrages des hébergeurs dont le disque est éphémère.
    const storageKey = `uploads/venues/${id}/${randomUUID()}.${ext}`;
    const position = Math.max(-1, ...venue.photos.map((p) => p.position)) + 1;
    const [, photo] = await this.prisma.$transaction([
      this.prisma.mediaFile.create({
        data: {
          key: storageKey,
          contentType: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`,
          size: file.size,
          data: new Uint8Array(file.buffer),
        },
      }),
      this.prisma.venuePhoto.create({
        data: {
          venueId: id,
          storageKey,
          altText: altText.trim().slice(0, 160) || `${venue.name} — photo ${position + 1}`,
          position,
        },
        select: { id: true, storageKey: true, altText: true, position: true },
      }),
    ]);
    return photo;
  }

  async deletePhoto(id: string, photoId: string) {
    const photo = await this.prisma.venuePhoto.findFirst({ where: { id: photoId, venueId: id } });
    if (!photo) throw new NotFoundException('Photo introuvable');
    // Les visuels de démo (fichiers du dépôt) ne sont pas en base : deleteMany ne fait rien pour eux
    await this.prisma.$transaction([
      this.prisma.venuePhoto.delete({ where: { id: photoId } }),
      this.prisma.mediaFile.deleteMany({ where: { key: photo.storageKey } }),
    ]);
    await this.normalizePositions(id);
  }

  /** Nouvel ordre des photos (la première devient la photo de couverture). */
  async reorderPhotos(id: string, photoIds: string[]) {
    const photos = await this.prisma.venuePhoto.findMany({
      where: { venueId: id },
      select: { id: true },
    });
    const known = new Set(photos.map((p) => p.id));
    if (photoIds.length !== known.size || !photoIds.every((p) => known.has(p))) {
      throw new BadRequestException('Liste de photos incomplète ou invalide');
    }
    // Deux passes pour respecter la contrainte d'unicité (venue_id, position)
    await this.prisma.$transaction([
      ...photoIds.map((pid, i) =>
        this.prisma.venuePhoto.update({ where: { id: pid }, data: { position: 1000 + i } }),
      ),
      ...photoIds.map((pid, i) =>
        this.prisma.venuePhoto.update({ where: { id: pid }, data: { position: i } }),
      ),
    ]);
  }

  // ---------------- Utilitaires ----------------

  private fields(input: VenueUpsert) {
    return {
      name: input.name,
      description: input.description,
      type: input.type,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      priceRange: input.priceRange,
      phone: input.phone ?? null,
      website: input.website ?? null,
      instagram: input.instagram?.replace(/^@/, '') ?? null,
      status: input.status,
      isDemo: input.isDemo,
      ...(input.markVerified ? { lastVerifiedAt: new Date() } : {}),
    };
  }

  private async ensure(id: string) {
    const v = await this.prisma.venue.findUnique({ where: { id }, select: { id: true } });
    if (!v) throw new NotFoundException('Établissement introuvable');
  }

  private async cityId(slug: string) {
    const city = await this.prisma.city.findUnique({ where: { slug }, select: { id: true } });
    if (!city) throw new BadRequestException('Ville inconnue');
    return city.id;
  }

  private async genreIds(slugs: string[]) {
    const genres = await this.prisma.musicGenre.findMany({
      where: { slug: { in: slugs } },
      select: { id: true },
    });
    return genres.map((g) => g.id);
  }

  private async normalizePositions(id: string) {
    const photos = await this.prisma.venuePhoto.findMany({
      where: { venueId: id },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    if (photos.length)
      await this.reorderPhotos(
        id,
        photos.map((p) => p.id),
      );
  }
}
