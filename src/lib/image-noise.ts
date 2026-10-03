/**
 * Scraped image URLs that are page furniture, never a product photo: slider
 * dummies, lazy-load spacers, "no image" stand-ins, logos and banners.
 */
const PLACEHOLDER_IMAGE =
  /(dummy|placeholder|spacer|blank\.(gif|png)|transparent\.(gif|png)|1x1|no[-_]?image|noimage|default[-_]image|lazy[-_]?load|loader|revslider|slider|banner|logo|favicon|sprite)/i;

export function isPlaceholderImageUrl(url: string): boolean {
  let path = url;
  try {
    path = new URL(url, "https://x").pathname;
  } catch {
    // keep the raw string
  }
  return PLACEHOLDER_IMAGE.test(path);
}
