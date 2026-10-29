/**
 * Vérifie le type RÉEL d'un fichier à partir de ses premiers octets (« magic bytes »).
 * Le nom de fichier et le Content-Type envoyés par le client ne sont pas fiables.
 */
export function detectImageType(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 Mo
export const MAX_PHOTOS_PER_VENUE = 10;
