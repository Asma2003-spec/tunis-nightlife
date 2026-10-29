/** Affichage d'une note (étoiles pleines, demi-étoile, vides). */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return <Star key={i} fill={fill} size={size} />;
      })}
    </span>
  );
}

export function Star({ fill, size = 16 }: { fill: number; size?: number }) {
  const id = `g${Math.round(fill * 100)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="var(--color-star)" />
          <stop offset={`${fill * 100}%`} stopColor="var(--color-surface-2)" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
      />
    </svg>
  );
}

/** "4,3" à la française */
export const formatRating = (n: number) => n.toFixed(1).replace('.', ',');
