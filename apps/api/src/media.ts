import { join, resolve, sep } from 'node:path';

/** Dossier des médias servis sous /media (apps/api/media). */
export const MEDIA_ROOT = resolve(__dirname, '..', 'media');

/** Chemin absolu d'une clé de stockage, en refusant toute sortie du dossier (../). */
export function mediaPath(storageKey: string): string {
  const full = resolve(join(MEDIA_ROOT, storageKey));
  if (!full.startsWith(MEDIA_ROOT + sep)) throw new Error('Clé de stockage invalide');
  return full;
}
