import { resolve } from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import type { PrismaService } from './prisma/prisma.service';

/** Dossier des visuels de démonstration versionnés (apps/api/media), servis sous /media. */
export const MEDIA_ROOT = resolve(__dirname, '..', 'media');

const KEY_PATTERN = /^uploads\/venues\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/**
 * Sert les photos envoyées depuis le back-office, stockées en base : GET /media/uploads/...
 * La clé est validée par une expression stricte avant toute requête.
 */
export function uploadedMediaHandler(prisma: PrismaService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    try {
      const key = `uploads${decodeURIComponent(req.path)}`;
      if (!KEY_PATTERN.test(key)) return next();
      const file = await prisma.mediaFile.findUnique({
        where: { key },
        select: { contentType: true, data: true },
      });
      // Absent de la base : on laisse le dossier media/ répondre (anciennes photos locales)
      if (!file) return next();
      res.setHeader('Content-Type', file.contentType);
      // Le nom contient un identifiant unique : le fichier ne change jamais
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.end(Buffer.from(file.data));
    } catch (e) {
      return next(e);
    }
  };
}
