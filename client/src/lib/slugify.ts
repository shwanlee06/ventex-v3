/**
 * Generate a URL-safe slug from a venture name.
 * Lowercase, spaces → hyphens, special chars removed.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&]/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Find a venture by its slug from an array of ventures.
 */
export function findVentureBySlug<T extends { name: string }>(
  ventures: T[],
  slug: string
): T | undefined {
  return ventures.find((v) => slugify(v.name) === slug);
}
