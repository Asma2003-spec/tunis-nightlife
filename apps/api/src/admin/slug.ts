/** "Nébuleuse Club" → "nebuleuse-club" */
export function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'etablissement'
  );
}

/** Ajoute -2, -3… si le slug est déjà pris. */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = slugify(base);
  for (let i = 2; await exists(slug); i++) slug = `${slugify(base)}-${i}`;
  return slug;
}
