import { z } from 'zod';
import {
  PAGE_SIZE_MAX,
  PriceRangeSchema,
  TUNISIA_BOUNDS,
  UserRoleSchema,
  VenueTypeSchema,
  type PriceRange,
  type UserRole,
  type VenueType,
} from './index';

/* ------------------------------------------------------------------ */
/* Statuts                                                             */
/* ------------------------------------------------------------------ */

export const VENUE_STATUSES = ['DRAFT', 'PENDING', 'PUBLISHED', 'SUSPENDED'] as const;
export const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CANCELLED'] as const;
export const REVIEW_STATUSES = ['PENDING', 'PUBLISHED', 'REJECTED'] as const;
export const REPORT_STATUSES = ['OPEN', 'RESOLVED', 'DISMISSED'] as const;
export const REPORT_TARGETS = ['VENUE', 'REVIEW', 'EVENT'] as const;

export type VenueStatus = (typeof VENUE_STATUSES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  PUBLISHED: 'Publié',
  SUSPENDED: 'Suspendu',
  CANCELLED: 'Annulé',
  REJECTED: 'Masqué',
  OPEN: 'À traiter',
  RESOLVED: 'Traité',
  DISMISSED: 'Classé sans suite',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Utilisateur',
  MODERATOR: 'Modérateur',
  ADMIN: 'Administrateur',
};

export const REPORT_REASONS = [
  'Contenu offensant',
  'Faux avis',
  'Information incorrecte',
  'Spam ou publicité',
  'Autre',
] as const;

/* ------------------------------------------------------------------ */
/* Requêtes de liste                                                   */
/* ------------------------------------------------------------------ */

export const AdminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(20),
  q: z.string().trim().max(80).optional(),
  status: z.string().trim().max(20).optional(),
});
export type AdminListQuery = z.infer<typeof AdminListQuerySchema>;

/* ------------------------------------------------------------------ */
/* Établissements                                                      */
/* ------------------------------------------------------------------ */

const minutes = z.number().int().min(0).max(1439);

export const OpeningSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  opensAt: minutes,
  closesAt: minutes,
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

export const VenueUpsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20, 'Au moins 20 caractères').max(4000),
  type: VenueTypeSchema,
  citySlug: z.string().trim().min(1).max(60),
  address: z.string().trim().min(5).max(255),
  latitude: z.number().min(TUNISIA_BOUNDS.minLat).max(TUNISIA_BOUNDS.maxLat),
  longitude: z.number().min(TUNISIA_BOUNDS.minLng).max(TUNISIA_BOUNDS.maxLng),
  priceRange: PriceRangeSchema,
  phone: optionalText(30),
  website: z
    .union([z.url({ protocol: /^https?$/ }).max(255), z.literal('')])
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  instagram: optionalText(60),
  status: z.enum(VENUE_STATUSES),
  isDemo: z.boolean(),
  genreSlugs: z.array(z.string().max(40)).max(10),
  openingHours: z.array(OpeningSlotSchema).max(21),
  /** Si vrai, la date de dernière vérification est mise à jour. */
  markVerified: z.boolean().optional(),
});
export type VenueUpsertInput = z.input<typeof VenueUpsertSchema>;

export interface AdminVenueRow {
  id: string;
  slug: string;
  name: string;
  type: VenueType;
  city: string;
  status: VenueStatus;
  isDemo: boolean;
  rating: { average: number | null; count: number };
  photoCount: number;
  updatedAt: string;
}

export interface AdminVenueDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: VenueType;
  citySlug: string;
  address: string;
  latitude: number;
  longitude: number;
  priceRange: PriceRange;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  status: VenueStatus;
  isDemo: boolean;
  lastVerifiedAt: string | null;
  genreSlugs: string[];
  openingHours: { weekday: number; opensAt: number; closesAt: number }[];
  photos: { id: string; storageKey: string; altText: string; position: number }[];
}

/* ------------------------------------------------------------------ */
/* Événements                                                          */
/* ------------------------------------------------------------------ */

export const EventUpsertSchema = z
  .object({
    venueId: z.uuid(),
    title: z.string().trim().min(3).max(140),
    description: z.string().trim().min(10).max(2000),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    status: z.enum(EVENT_STATUSES),
  })
  .refine((e) => new Date(e.endsAt) > new Date(e.startsAt), {
    message: 'La fin doit être après le début',
    path: ['endsAt'],
  });
export type EventUpsertInput = z.input<typeof EventUpsertSchema>;

export interface AdminEventRow {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  venue: { id: string; name: string };
}

/* ------------------------------------------------------------------ */
/* Modération                                                          */
/* ------------------------------------------------------------------ */

export const ReviewModerationSchema = z.object({
  status: z.enum(['PUBLISHED', 'REJECTED']),
});

export interface AdminReviewRow {
  id: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  author: { id: string; name: string; email: string };
  venue: { slug: string; name: string };
  openReports: number;
}

export const CreateReportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
});
export type CreateReportInput = z.input<typeof CreateReportSchema>;

export const ReportDecisionSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
  /** Pour un avis signalé : le masquer en même temps que le signalement est traité. */
  hideTarget: z.boolean().optional(),
});

export interface AdminReportRow {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: { name: string; email: string };
  handledBy: { name: string } | null;
  /** Résumé lisible de la cible (nom de l'établissement, extrait de l'avis…) */
  target: { label: string; excerpt?: string; venueSlug?: string; status?: string } | null;
}

/* ------------------------------------------------------------------ */
/* Utilisateurs et statistiques                                        */
/* ------------------------------------------------------------------ */

export const RoleChangeSchema = z.object({ role: UserRoleSchema });

/** Nouveau mot de passe choisi par un administrateur (mêmes règles qu'à l'inscription). */
export const AdminPasswordResetSchema = z.object({
  password: z.string().min(8, 'Au moins 8 caractères').max(128, '128 caractères maximum'),
});
export type AdminPasswordResetInput = z.infer<typeof AdminPasswordResetSchema>;

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  reviewCount: number;
}

export interface AdminStats {
  venues: Record<VenueStatus, number>;
  users: number;
  newUsers7d: number;
  reviews: number;
  reviews7d: number;
  averageRating: number | null;
  openReports: number;
  upcomingEvents: number;
  topVenues: { slug: string; name: string; average: number; count: number }[];
  /** Avis publiés par jour sur les 14 derniers jours (heure de Tunis) */
  reviewsPerDay: { date: string; count: number }[];
}
