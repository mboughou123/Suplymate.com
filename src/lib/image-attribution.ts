// How a stored image says where it came from. Flags live in the caption, the
// alt text, and the originalUrl hash so they survive without a schema change.
// Real photographs always rank ahead of AI illustrations.

export const ALIBABA_PHOTO_CAPTION = "Photo: supplier's Alibaba store";
export const AI_GENERATED_LABEL = "Illustration (AI-generated)";
/** Sort key for AI illustrations so they sit after any real photo. */
export const AI_GENERATED_SORT_ORDER = 900_000;

export type PhotoSource = "alibaba-store";

export type ImageAttribution = {
  aiGenerated: boolean;
  photoSource: PhotoSource | null;
};

const AI_PARAM = "aiGenerated";
const SOURCE_PARAM = "photoSource";

function hashParams(url: string | null | undefined): URLSearchParams {
  const hash = url?.split("#")[1] ?? "";
  return new URLSearchParams(hash);
}

export function readImageAttribution(input: {
  url?: string | null;
  altText?: string | null;
  caption?: string | null;
  originalUrl?: string | null;
  aiGenerated?: boolean | null;
  photoSource?: string | null;
}): ImageAttribution {
  let aiGenerated = Boolean(input.aiGenerated);
  let photoSource: PhotoSource | null = input.photoSource === "alibaba-store" ? "alibaba-store" : null;
  for (const raw of [input.url, input.originalUrl]) {
    const params = hashParams(raw);
    if (params.get(AI_PARAM) === "1" || params.get(AI_PARAM) === "true") aiGenerated = true;
    if (params.get(SOURCE_PARAM) === "alibaba-store") photoSource = "alibaba-store";
  }
  const text = `${input.altText ?? ""}\n${input.caption ?? ""}`;
  if (text.includes(AI_GENERATED_LABEL)) aiGenerated = true;
  if ((input.caption ?? "").includes(ALIBABA_PHOTO_CAPTION) || text.includes(ALIBABA_PHOTO_CAPTION)) {
    photoSource = "alibaba-store";
  }
  return { aiGenerated, photoSource };
}

/** URL the browser should request — attribution stays out of the path. */
export function displayImageUrl(url: string): string {
  return url.split("#")[0];
}

export function decorateImageUrl(url: string, attr: ImageAttribution): string {
  const [base, hash] = url.split("#");
  const params = new URLSearchParams(hash ?? "");
  if (attr.aiGenerated) params.set(AI_PARAM, "1");
  else params.delete(AI_PARAM);
  if (attr.photoSource) params.set(SOURCE_PARAM, attr.photoSource);
  else params.delete(SOURCE_PARAM);
  const rest = params.toString();
  return rest ? `${base}#${rest}` : base;
}

export function aiAltText(name: string, alt?: string | null): string {
  const base = (alt ?? "").replace(/\s+/g, " ").trim();
  if (base.includes(AI_GENERATED_LABEL)) return base.slice(0, 300);
  const composed = base ? `${base} — ${AI_GENERATED_LABEL}` : `${name} — ${AI_GENERATED_LABEL}`;
  return composed.slice(0, 300);
}

/** Real photos first, then AI illustrations, keeping the original order inside each group. */
export function rankByAuthenticity<T extends { aiGenerated?: boolean }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(Boolean(a.item.aiGenerated)) - Number(Boolean(b.item.aiGenerated)) || a.index - b.index)
    .map((row) => row.item);
}
