/** Design system Tunis Nightlife — mêmes couleurs que le Web (apps/web/src/app/globals.css). */
export const colors = {
  night: '#0B0B10',
  surface: '#17151F',
  surface2: '#221F2D',
  violet: '#8B5CF6',
  violetGlow: '#A78BFA',
  ink: '#F5F3FF',
  muted: '#A7A2B5',
  star: '#FBBF24',
  green: '#6EE7B7',
  pink: '#F9A8D4',
  blue: '#38BDF8',
} as const;

export const radius = { md: 12, lg: 16, full: 999 } as const;
export const space = (n: number) => n * 4;

/** "4,3" à la française */
export const formatRating = (n: number) => n.toFixed(1).replace('.', ',');
export const formatKm = (n: number) => `${String(n).replace('.', ',')} km`;
