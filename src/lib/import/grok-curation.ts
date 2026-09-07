// Grok-powered curation steps for the daily import. Everything here is OPTIONAL:
// when XAI_API_KEY is not set (or a call fails) each helper returns a safe
// heuristic / no-op result and a `note` explaining what was skipped, so the
// import never depends on the model.
//
// What Grok is used for (only things a language/vision model can genuinely do):
//   1. Photo curation — classify candidate supplier photos (factory exterior,
//      production line, product, certificate, logo, irrelevant/stock/people) and
//      rate quality 1–5 so we keep the best N, route certificates to the
//      certification gallery and drop logos / irrelevant shots.
//   2. Product copy — a concise, factual description + spec bullets from the
//      scraped title/attributes. The prompt forbids inventing certifications,
//      prices, MOQ or lead times.
//   3. Supplier summary — a short profile blurb from the facts we already have.
//
// Grok cannot edit pixels; "enhanced photos" are handled by enhance-image.ts.

import { isXaiConfigured, xaiJson, xaiVisionModel, xaiModel } from "@/lib/xai";

export const PHOTO_KINDS = [
  "factory_exterior",
  "production_line",
  "product",
  "certificate",
  "logo",
  "irrelevant",
] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

export type CuratedPhoto = {
  url: string;
  kind: PhotoKind;
  /** 1 (unusable) … 5 (excellent). */
  quality: number;
  /** Whether the pipeline should import this photo. */
  keep: boolean;
  note?: string;
};

export type CurationResult = {
  photos: CuratedPhoto[];
  /** "grok" when the vision model classified, "heuristic" otherwise. */
  source: "grok" | "heuristic";
  note?: string;
};

const MAX_IMAGES_PER_CALL = 10;

function isPhotoKind(v: unknown): v is PhotoKind {
  return typeof v === "string" && (PHOTO_KINDS as readonly string[]).includes(v);
}

function clampQuality(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/**
 * URL-based fallback classification used when Grok is unavailable. Deliberately
 * conservative: only obvious logo / certificate / icon paths are re-routed,
 * everything else is kept as a gallery photo.
 */
export function heuristicPhotoKind(url: string): PhotoKind {
  const u = url.toLowerCase();
  if (/(^|[/_\-.])(logo|logos|wordmark|brandmark|favicon)([/_\-.]|$)/.test(u)) return "logo";
  if (/(certificate|certificat|cert[-_/]|\/certs?\/|iso[-_ ]?\d{4,5}|api[-_ ]?(5l|q1|2b)|accreditation)/.test(u)) {
    return "certificate";
  }
  if (/(icon|sprite|pixel|tracking|placeholder|blank\.|spacer|1x1|badge)/.test(u)) return "irrelevant";
  if (/(120x120|100x100|64x64|48x48|32x32|thumb(nail)?[-_.]?\d{0,3}\.)/.test(u)) return "irrelevant";
  return "product";
}

export function heuristicCuration(urls: string[], keep: number): CurationResult {
  let kept = 0;
  const photos: CuratedPhoto[] = urls.map((url) => {
    const kind = heuristicPhotoKind(url);
    const importable = kind !== "logo" && kind !== "irrelevant";
    const within = kind === "certificate" || kept < keep;
    const keepIt = importable && within;
    if (keepIt && kind !== "certificate") kept++;
    return { url, kind, quality: 3, keep: keepIt };
  });
  return { photos, source: "heuristic", note: "XAI_API_KEY not set — used URL heuristics." };
}

export type CurationContext = {
  supplierName: string;
  category?: string | null;
  country?: string | null;
};

type GrokPhotoVerdict = { index?: number; kind?: string; quality?: number; note?: string };

/**
 * Classify + rate candidate photos with Grok's vision model and decide which to
 * keep. `keep` bounds how many non-certificate photos survive (best quality
 * first). Certificates are always kept (they go to the certification gallery),
 * logos and irrelevant/stock/people shots are dropped.
 */
export async function curateSupplierPhotos(
  urls: string[],
  ctx: CurationContext,
  opts: { keep?: number; fetchImpl?: typeof fetch } = {}
): Promise<CurationResult> {
  const keep = opts.keep ?? 6;
  const unique = [...new Set(urls.map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u)))];
  if (unique.length === 0) return { photos: [], source: "heuristic" };
  if (!isXaiConfigured()) return heuristicCuration(unique, keep);

  const verdicts = new Map<string, { kind: PhotoKind; quality: number; note?: string }>();
  let failure: string | undefined;

  for (let i = 0; i < unique.length; i += MAX_IMAGES_PER_CALL) {
    const batch = unique.slice(i, i + MAX_IMAGES_PER_CALL);
    const res = await xaiJson<{ photos?: GrokPhotoVerdict[] }>({
      model: xaiVisionModel(),
      temperature: 0,
      maxTokens: 800,
      fetchImpl: opts.fetchImpl,
      messages: [
        {
          role: "system",
          content:
            "You curate photos for a B2B industrial supplier directory. For each image, " +
            "classify it as exactly one of: factory_exterior (mill/plant/warehouse building or aerial), " +
            "production_line (machinery, workshop, manufacturing in progress), product (the goods themselves), " +
            "certificate (a scanned certificate, accreditation or test report document), logo (wordmark/brand mark/icon), " +
            "irrelevant (stock photo, people portraits, unrelated, maps, screenshots, banners with mostly text). " +
            "Rate quality 1-5 (1 = tiny/blurry/watermarked/unusable, 5 = sharp, well lit, representative). " +
            'Reply ONLY with JSON: {"photos":[{"index":0,"kind":"product","quality":4,"note":"short reason"}]} ' +
            "with one entry per image in the given order. Never invent images that were not provided.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Supplier: ${ctx.supplierName}` +
                (ctx.category ? ` · Category: ${ctx.category}` : "") +
                (ctx.country ? ` · Country: ${ctx.country}` : "") +
                `\n${batch.length} image(s) follow, index 0..${batch.length - 1}.`,
            },
            ...batch.map((url) => ({
              type: "image_url" as const,
              image_url: { url, detail: "low" as const },
            })),
          ],
        },
      ],
    });

    if (!res.ok) {
      failure = res.error;
      break;
    }
    const list = Array.isArray(res.data.photos) ? res.data.photos : [];
    list.forEach((v, pos) => {
      const idx = typeof v.index === "number" && batch[v.index] ? v.index : pos;
      const url = batch[idx];
      if (!url) return;
      verdicts.set(url, {
        kind: isPhotoKind(v.kind) ? v.kind : "irrelevant",
        quality: clampQuality(v.quality),
        note: typeof v.note === "string" ? v.note.slice(0, 200) : undefined,
      });
    });
  }

  if (failure && verdicts.size === 0) {
    const fallback = heuristicCuration(unique, keep);
    return { ...fallback, note: `Grok curation failed (${failure}); used URL heuristics.` };
  }

  // Rank non-certificate keepers by quality (desc), stable by original order.
  const candidates = unique
    .map((url, order) => ({ url, order, v: verdicts.get(url) }))
    .map(({ url, order, v }) => ({
      url,
      order,
      kind: v?.kind ?? heuristicPhotoKind(url),
      quality: v?.quality ?? 3,
      note: v?.note,
    }));

  const importable = candidates.filter(
    (c) => c.kind !== "logo" && c.kind !== "irrelevant" && c.kind !== "certificate" && c.quality >= 2
  );
  importable.sort((a, b) => b.quality - a.quality || a.order - b.order);
  const keepSet = new Set(importable.slice(0, keep).map((c) => c.url));

  const photos: CuratedPhoto[] = candidates.map((c) => ({
    url: c.url,
    kind: c.kind,
    quality: c.quality,
    keep: c.kind === "certificate" ? c.quality >= 2 : keepSet.has(c.url),
    note: c.note,
  }));

  return {
    photos,
    source: "grok",
    note: failure ? `Grok curation partially failed (${failure}); remaining photos used heuristics.` : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Product copy                                                        */
/* ------------------------------------------------------------------ */

export type ProductCopyInput = {
  name: string;
  supplierName: string;
  category?: string | null;
  attributes?: Record<string, string> | null;
  existingDescription?: string | null;
  sourceUrl?: string | null;
};

export type ProductCopyResult =
  | { ok: true; description: string; specs: string[]; model: string }
  | { ok: false; note: string };

/**
 * Concise, factual product description + spec bullets. The model is told to use
 * ONLY the supplied facts — never certifications, prices, MOQ or lead times that
 * are not in the input — and to keep the copy short.
 */
export async function generateProductDescription(
  input: ProductCopyInput,
  opts: { fetchImpl?: typeof fetch } = {}
): Promise<ProductCopyResult> {
  if (!isXaiConfigured()) return { ok: false, note: "XAI_API_KEY not set — kept scraped description." };

  const facts = {
    product_name: input.name,
    supplier: input.supplierName,
    category: input.category ?? undefined,
    attributes: input.attributes && Object.keys(input.attributes).length ? input.attributes : undefined,
    scraped_description: input.existingDescription?.slice(0, 1200) || undefined,
    source_url: input.sourceUrl ?? undefined,
  };

  const res = await xaiJson<{ description?: string; specs?: unknown }>({
    model: xaiModel(),
    temperature: 0.2,
    maxTokens: 500,
    fetchImpl: opts.fetchImpl,
    messages: [
      {
        role: "system",
        content:
          "You write catalogue copy for a B2B industrial marketplace. Using ONLY the facts provided, write a " +
          "concise factual product description (2-3 sentences, max 70 words, no marketing superlatives) and up to 6 " +
          "short specification bullets. STRICT RULES: never invent or infer certifications, standards, prices, " +
          "currencies, MOQ, lead times, capacities or origins that are not explicitly present in the facts. If a " +
          "detail is unknown, omit it. Do not mention the supplier's reputation. " +
          'Reply ONLY with JSON: {"description":"...","specs":["...", "..."]}.',
      },
      { role: "user", content: JSON.stringify(facts) },
    ],
  });
  if (!res.ok) return { ok: false, note: res.error };

  const description = typeof res.data.description === "string" ? res.data.description.trim() : "";
  const specs = Array.isArray(res.data.specs)
    ? res.data.specs.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()).slice(0, 6)
    : [];
  if (!description) return { ok: false, note: "Grok returned no description." };
  return { ok: true, description: description.slice(0, 600), specs, model: res.model };
}

/* ------------------------------------------------------------------ */
/* Supplier summary                                                    */
/* ------------------------------------------------------------------ */

export type SupplierSummaryInput = {
  name: string;
  country?: string | null;
  city?: string | null;
  category?: string | null;
  website?: string | null;
  productLines?: string[];
  existingDescription?: string | null;
};

export type SupplierSummaryResult =
  | { ok: true; summary: string; model: string }
  | { ok: false; note: string };

/** Short (max ~60 words) factual profile summary from known facts only. */
export async function summarizeSupplier(
  input: SupplierSummaryInput,
  opts: { fetchImpl?: typeof fetch } = {}
): Promise<SupplierSummaryResult> {
  if (!isXaiConfigured()) return { ok: false, note: "XAI_API_KEY not set — kept source description." };

  const res = await xaiJson<{ summary?: string }>({
    model: xaiModel(),
    temperature: 0.2,
    maxTokens: 300,
    fetchImpl: opts.fetchImpl,
    messages: [
      {
        role: "system",
        content:
          "Write a neutral 1-2 sentence (max 60 words) profile summary of an industrial supplier for a B2B directory, " +
          "using ONLY the facts given. Never claim certifications, verification, awards, capacities, prices or " +
          "customer names that are not in the facts. No superlatives. " +
          'Reply ONLY with JSON: {"summary":"..."}.',
      },
      {
        role: "user",
        content: JSON.stringify({
          name: input.name,
          location: [input.city, input.country].filter(Boolean).join(", ") || undefined,
          category: input.category ?? undefined,
          website: input.website ?? undefined,
          product_lines: input.productLines?.slice(0, 12),
          source_description: input.existingDescription?.slice(0, 1500) || undefined,
        }),
      },
    ],
  });
  if (!res.ok) return { ok: false, note: res.error };
  const summary = typeof res.data.summary === "string" ? res.data.summary.trim() : "";
  if (!summary) return { ok: false, note: "Grok returned no summary." };
  return { ok: true, summary: summary.slice(0, 500), model: res.model };
}
