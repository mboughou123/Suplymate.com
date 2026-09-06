// Import pack formats → one common, DB-free `ImportPack` shape.
//
// The daily job accepts three payload formats and normalises them here so the
// orchestrator (daily-import.ts) has a single code path:
//
//   1. "lister"  — the daily research pack produced by the Grok Bot agents
//                  ("Lister" / "Research QA" / "Image Enhancer") that pushed
//                  data/daily-YYYY-MM-DD-suppliers.json + -products.json:
//                  { suppliers: [{ company_name, primary_category, country, city,
//                    website, description, product_lines[], certifications[{name,source}],
//                    moq, source_url, photo_urls[], local_images[], slug, ... }],
//                    products: [{ product_name, product_slug, supplier_name,
//                    supplier_slug_guess, source_url, unit_price, currency, unit,
//                    price_note, image_urls[], needs_ai_generate }] }
//   2. "bundle"  — the existing SupplierBundle JSON (src/data/supplier-bundle.ts,
//                  scripts/import/examples/metalworks-china.json), or an array of them.
//   3. "csv"     — the admin supplier CSV (src/lib/supplier-csv.ts).
//
// Nothing here touches the database. Every supplier is normalised as PENDING —
// imported suppliers are never auto-verified.

import { parseSupplierBundle, normalizeBundleImages, type SupplierBundle } from "@/data/supplier-bundle";
import { importSuppliersFromCsv } from "@/lib/supplier-csv";
import {
  slugifySupplierId,
  dedupeStrings,
  type SupplierInput,
  type CertificationDetail,
} from "@/lib/supplier-normalize";
import { supplierCategories, type SupplierCategory } from "@/data/suppliers";

export type PackFormat = "lister" | "bundle" | "csv" | "outscraper";

export type PackCertification = {
  name: string;
  type?: string | null;
  imageUrl?: string | null;
  certificateUrl?: string | null;
  sourceUrl?: string | null;
};

export type PackSupplier = {
  /** Stable external id (slug) used for idempotent upserts. */
  externalId: string;
  input: SupplierInput;
  /** Candidate factory / gallery photo URLs (public http(s) only). */
  photoUrls: string[];
  logoUrl: string | null;
  certifications: PackCertification[];
  productLines: string[];
  sourceFormat: PackFormat;
};

export type PackProduct = {
  /** Stable external id used for idempotent upserts. */
  externalId: string;
  supplierExternalId: string;
  supplierName: string;
  name: string;
  slug: string;
  category: SupplierCategory | null;
  description: string | null;
  imageUrls: string[];
  /** Null = RFQ / no public price. Never invented. */
  price: number | null;
  currency: string | null;
  priceUnit: string | null;
  priceNote: string | null;
  moq: string | null;
  specifications: Record<string, string>;
  sourceUrl: string;
  productUrl: string | null;
  sku: string | null;
  status: "pending";
};

export type ImportPack = {
  format: PackFormat;
  label: string;
  generatedAt: string | null;
  suppliers: PackSupplier[];
  products: PackProduct[];
  warnings: string[];
};

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean) : [];

export function slugifyProduct(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

const CATEGORY_ALIASES: Record<string, SupplierCategory> = {
  "tube & pipes": "Tubes & Pipes",
  "tubes & pipes": "Tubes & Pipes",
  "tubes and pipes": "Tubes & Pipes",
  "steel & metals": "Steel & Metals",
  "steel and metals": "Steel & Metals",
  "cables & electrical": "Cables & Electrical",
  "cables and electrical": "Cables & Electrical",
  packaging: "Packaging",
  construction: "Construction",
  "industrial parts": "Industrial Parts",
};

/** Normalise a free-form category label to a canonical SupplierCategory (or null). */
export function normalizeCategory(v: unknown): SupplierCategory | null {
  const s = str(v);
  if (!s) return null;
  if ((supplierCategories as string[]).includes(s)) return s as SupplierCategory;
  return CATEGORY_ALIASES[s.toLowerCase().replace(/\s+/g, " ")] ?? null;
}

/**
 * Resolve a pack image reference to a fetchable public URL.
 *  - http(s) URLs pass through.
 *  - Site-relative web paths (e.g. "/images/suppliers/…") resolve against
 *    IMPORT_PUBLIC_BASE_URL (or NEXTAUTH_URL) when configured.
 *  - Bot-VM filesystem paths ("/workspace/…", "C:\…") are dropped: they are only
 *    meaningful on the machine that produced the pack.
 */
export function resolvePackImageUrl(ref: string, baseUrl?: string | null): string | null {
  const v = ref.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^\/workspace\//i.test(v) || /^[a-z]:\\/i.test(v) || /^file:/i.test(v)) return null;
  if (v.startsWith("/")) {
    const base = (baseUrl ?? process.env.IMPORT_PUBLIC_BASE_URL ?? process.env.NEXTAUTH_URL ?? "").trim();
    if (!/^https?:\/\//i.test(base)) return null;
    try {
      return new URL(v, base).toString();
    } catch {
      return null;
    }
  }
  return null;
}

function resolveAll(refs: string[], baseUrl?: string | null): string[] {
  return dedupeStrings(refs.map((r) => resolvePackImageUrl(r, baseUrl) ?? "").filter(Boolean));
}

/* ------------------------------------------------------------------ */
/* Format detection                                                    */
/* ------------------------------------------------------------------ */

export function detectPackFormat(raw: unknown): PackFormat | null {
  if (typeof raw === "string") return raw.trim().startsWith("{") || raw.trim().startsWith("[") ? null : "csv";
  if (!raw || typeof raw !== "object") return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === "object") {
      if ("supplierName" in first) return "bundle";
      if ("company_name" in first || "product_name" in first) return "lister";
    }
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.supplierName === "string") return "bundle";
  if (Array.isArray(o.bundles)) return "bundle";
  if (Array.isArray(o.suppliers) || Array.isArray(o.products)) {
    const s = (o.suppliers as unknown[] | undefined)?.[0] as Record<string, unknown> | undefined;
    const p = (o.products as unknown[] | undefined)?.[0] as Record<string, unknown> | undefined;
    if (s && typeof s === "object" && "supplierName" in s) return "bundle";
    if ((s && "company_name" in s) || (p && "product_name" in p)) return "lister";
    if (!s && !p) return "lister";
    if (s && ("name" in s || "company_name" in s)) return "lister";
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 1. Lister / Grok Bot daily pack                                     */
/* ------------------------------------------------------------------ */

type ListerSupplier = Record<string, unknown>;
type ListerProduct = Record<string, unknown>;

function listerCertifications(v: unknown, fallbackSource: string | null): PackCertification[] {
  if (!Array.isArray(v)) return [];
  const out: PackCertification[] = [];
  for (const item of v) {
    if (typeof item === "string") {
      if (item.trim()) out.push({ name: item.trim(), sourceUrl: fallbackSource });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    const name = str(c.name) ?? str(c.cert_name) ?? str(c.title);
    if (!name) continue;
    out.push({
      name,
      type: str(c.type),
      imageUrl: resolvePackImageUrl(str(c.image_url) ?? str(c.imageUrl) ?? str(c.image) ?? "") ?? null,
      certificateUrl: str(c.certificate_url) ?? str(c.certificateUrl) ?? str(c.pdf) ?? null,
      sourceUrl: str(c.source) ?? str(c.source_url) ?? str(c.sourceUrl) ?? fallbackSource,
    });
  }
  return out;
}

function listerSupplier(s: ListerSupplier, baseUrl?: string | null): PackSupplier | null {
  const name = str(s.company_name) ?? str(s.name) ?? str(s.supplier_name);
  if (!name) return null;
  const slug = str(s.slug) ?? slugifySupplierId(name);
  const website = str(s.website);
  const sourceUrl = str(s.source_url) ?? str(s.sourceUrl) ?? website;
  const category = normalizeCategory(s.primary_category ?? s.category);
  const productLines = strList(s.product_lines ?? s.products);

  const certs = listerCertifications(s.certifications, website);
  // Separate certificate scans (e.g. cert_image_urls from the certs index) so
  // they never land in the factory gallery.
  const certImages = resolveAll(
    [
      ...strList(s.cert_image_urls),
      ...strList(s.certification_images),
      ...strList(s.certificationImages),
      ...strList(s.certification_image_urls),
    ],
    baseUrl
  );
  certImages.forEach((url, i) => {
    const target = certs[i];
    if (target && !target.imageUrl) target.imageUrl = url;
    else certs.push({ name: certs[i]?.name ?? `Certificate ${i + 1}`, imageUrl: url, sourceUrl: website });
  });

  // Photo candidates: remote photo_urls + any hosted/enhanced URLs the bot
  // provides. `local_images` are VM paths unless a public base URL resolves them.
  const photoUrls = resolveAll(
    [
      ...strList(s.enhanced_image_urls),
      ...strList(s.enhanced_urls),
      ...strList(s.hosted_images),
      ...strList(s.image_urls),
      ...strList(s.photo_urls),
      ...strList(s.photoUrls),
      ...strList(s.images),
      ...strList(s.local_images),
    ],
    baseUrl
  );

  const logoUrl = resolvePackImageUrl(str(s.logo) ?? str(s.logo_url) ?? str(s.logoUrl) ?? "", baseUrl);
  const certDetails: CertificationDetail[] = certs.map((c) => ({
    name: c.name,
    type: c.type ?? null,
    imageUrl: c.imageUrl ?? null,
    certificateUrl: c.certificateUrl ?? null,
    sourceUrl: c.sourceUrl ?? null,
  }));

  const input: SupplierInput = {
    id: slug,
    name,
    category,
    country: str(s.country),
    city: str(s.city),
    address: str(s.address),
    website,
    phone: str(s.phone),
    email: str(s.email),
    description: str(s.description),
    logoUrl,
    imageUrl: photoUrls[0] ?? null,
    images: photoUrls,
    certificationImages: certs.map((c) => c.imageUrl ?? "").filter(Boolean),
    certifications: certDetails,
    products: productLines,
    moq: str(s.moq),
    sourceUrl,
    verificationStatus: "pending",
  };

  return {
    externalId: slug,
    input,
    photoUrls,
    logoUrl,
    certifications: certs,
    productLines,
    sourceFormat: "lister",
  };
}

function listerProduct(
  p: ListerProduct,
  supplierByName: Map<string, PackSupplier>,
  baseUrl?: string | null
): PackProduct | null {
  const name = str(p.product_name) ?? str(p.name);
  if (!name) return null;
  const supplierName = str(p.supplier_name) ?? str(p.supplier) ?? "Unknown supplier";
  const guess = str(p.supplier_slug_guess) ?? str(p.supplier_slug) ?? str(p.supplier_id);
  const known = supplierByName.get(supplierName.toLowerCase()) ?? (guess ? supplierByName.get(guess) : undefined);
  const supplierExternalId = known?.externalId ?? guess ?? slugifySupplierId(supplierName);
  const slug = str(p.product_slug) ?? str(p.slug) ?? slugifyProduct(name);
  const sourceUrl = str(p.source_url) ?? str(p.sourceUrl) ?? str(p.product_url) ?? `pack://${supplierExternalId}/${slug}`;

  const specs: Record<string, string> = {};
  const rawSpecs = p.specifications ?? p.attributes ?? p.specs;
  if (rawSpecs && typeof rawSpecs === "object" && !Array.isArray(rawSpecs)) {
    for (const [k, v] of Object.entries(rawSpecs as Record<string, unknown>)) {
      const val = str(v) ?? (typeof v === "number" ? String(v) : null);
      if (val) specs[k] = val;
    }
  } else if (Array.isArray(rawSpecs)) {
    rawSpecs.forEach((line, i) => {
      const val = str(line);
      if (val) specs[`spec_${i + 1}`] = val;
    });
  }

  return {
    externalId: `import-${supplierExternalId}-${slug}`.slice(0, 120),
    supplierExternalId,
    supplierName: known?.input.name ?? supplierName,
    name,
    slug,
    category: normalizeCategory(p.category ?? p.primary_category) ?? normalizeCategory(known?.input.category) ?? null,
    description: str(p.description) ?? str(p.summary),
    imageUrls: resolveAll(
      [
        ...strList(p.enhanced_image_urls),
        ...strList(p.hosted_images),
        ...strList(p.image_urls),
        ...strList(p.images),
        ...strList(p.local_images),
      ],
      baseUrl
    ),
    price: num(p.unit_price ?? p.price ?? p.base_price),
    currency: str(p.currency),
    priceUnit: str(p.unit) ?? str(p.price_unit),
    priceNote: str(p.price_note),
    moq: str(p.moq),
    specifications: specs,
    sourceUrl,
    productUrl: str(p.product_url) ?? null,
    sku: str(p.sku) ?? str(p.model),
    status: "pending",
  };
}

export function parseListerPack(raw: unknown, opts: { label?: string; baseUrl?: string | null } = {}): ImportPack {
  const warnings: string[] = [];
  const obj: Record<string, unknown> = Array.isArray(raw)
    ? raw[0] && typeof raw[0] === "object" && "product_name" in (raw[0] as object)
      ? { products: raw }
      : { suppliers: raw }
    : ((raw ?? {}) as Record<string, unknown>);

  const suppliers: PackSupplier[] = [];
  const byName = new Map<string, PackSupplier>();
  for (const s of Array.isArray(obj.suppliers) ? obj.suppliers : []) {
    if (!s || typeof s !== "object") continue;
    const ps = listerSupplier(s as ListerSupplier, opts.baseUrl);
    if (!ps) {
      warnings.push("Skipped a supplier entry without company_name.");
      continue;
    }
    suppliers.push(ps);
    byName.set(ps.input.name.toLowerCase(), ps);
    byName.set(ps.externalId, ps);
  }

  const products: PackProduct[] = [];
  for (const p of Array.isArray(obj.products) ? obj.products : []) {
    if (!p || typeof p !== "object") continue;
    const pp = listerProduct(p as ListerProduct, byName, opts.baseUrl);
    if (!pp) {
      warnings.push("Skipped a product entry without product_name.");
      continue;
    }
    products.push(pp);
  }

  const label = opts.label ?? str(obj.task) ?? str(obj.phase) ?? "lister-pack";
  return {
    format: "lister",
    label,
    generatedAt: str(obj.generated_at_utc) ?? str(obj.generated_at) ?? null,
    suppliers,
    products,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* 2. SupplierBundle JSON                                              */
/* ------------------------------------------------------------------ */

function bundleToPack(bundle: SupplierBundle, baseUrl?: string | null): { supplier: PackSupplier; products: PackProduct[] } {
  const externalId = bundle.supplierId?.trim() || slugifySupplierId(bundle.supplierName);
  const category = normalizeCategory(bundle.category) ?? normalizeCategory(bundle.products[0]?.category);
  const logoUrl = bundle.logo ? resolvePackImageUrl(bundle.logo, baseUrl) : null;
  const banner = bundle.bannerImage ? resolvePackImageUrl(bundle.bannerImage, baseUrl) : null;
  const productNames = bundle.products.map((p) => p.name);

  const supplier: PackSupplier = {
    externalId,
    input: {
      id: externalId,
      name: bundle.supplierName,
      category,
      country: bundle.country ?? null,
      website: bundle.website ?? null,
      description: bundle.description ?? null,
      logoUrl,
      imageUrl: banner,
      images: banner ? [banner] : [],
      products: productNames,
      moq: bundle.moq ?? null,
      sourceUrl: bundle.website ?? null,
      verificationStatus: "pending",
    },
    photoUrls: banner ? [banner] : [],
    logoUrl,
    certifications: [],
    productLines: productNames,
    sourceFormat: "bundle",
  };

  const products: PackProduct[] = bundle.products.map((p) => {
    const slug = slugifyProduct(p.name);
    return {
      externalId: `bundle-${externalId}-${slug.slice(0, 48)}`,
      supplierExternalId: externalId,
      supplierName: bundle.supplierName,
      name: p.name,
      slug,
      category: normalizeCategory(p.category) ?? category,
      description: p.description ?? null,
      imageUrls: resolveAll(normalizeBundleImages(p.image), baseUrl),
      price: Number.isFinite(p.price) ? p.price : null,
      currency: bundle.currency ?? "USD",
      priceUnit: null,
      priceNote: null,
      moq: p.moq ?? bundle.moq ?? null,
      specifications: p.specifications ?? {},
      sourceUrl: bundle.website ?? `bundle://${externalId}/${slug}`,
      productUrl: null,
      sku: null,
      status: "pending",
    };
  });

  return { supplier, products };
}

export function parseBundlePack(raw: unknown, opts: { label?: string; baseUrl?: string | null } = {}): ImportPack {
  const warnings: string[] = [];
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).bundles)
      ? ((raw as Record<string, unknown>).bundles as unknown[])
      : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).suppliers)
        ? ((raw as Record<string, unknown>).suppliers as unknown[])
        : [raw];

  const suppliers: PackSupplier[] = [];
  const products: PackProduct[] = [];
  list.forEach((item, i) => {
    try {
      const bundle = parseSupplierBundle(item);
      const mapped = bundleToPack(bundle, opts.baseUrl);
      suppliers.push(mapped.supplier);
      products.push(...mapped.products);
    } catch (err) {
      warnings.push(`bundles[${i}]: ${(err as Error).message}`);
    }
  });

  return {
    format: "bundle",
    label: opts.label ?? "supplier-bundle",
    generatedAt: null,
    suppliers,
    products,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* 3. Supplier CSV                                                     */
/* ------------------------------------------------------------------ */

/**
 * The phase-1 bot pack CSV used a `photoUrls` column; the canonical CSV mapper
 * (src/lib/csv.ts) knows it as `images`. Rewrite the header so both work.
 */
export function normalizeCsvHeader(text: string): string {
  const nl = text.indexOf("\n");
  const header = nl === -1 ? text : text.slice(0, nl);
  const rest = nl === -1 ? "" : text.slice(nl);
  if (/(^|,)\s*"?images"?\s*(,|$)/i.test(header)) return text;
  const fixed = header.replace(/(^|,)(\s*"?)(photo[_-]?urls?|photos)("?\s*)(?=,|$)/gi, "$1$2images$4");
  return fixed + rest;
}

export function parseCsvPack(text: string, opts: { label?: string; baseUrl?: string | null } = {}): ImportPack {
  const parsed = importSuppliersFromCsv(normalizeCsvHeader(text));
  const warnings = [
    ...parsed.errors.map((e) => `line ${e.line}: ${e.message}`),
    ...parsed.warnings.map((w) => `line ${w.line}: ${w.message}`),
  ];
  const suppliers: PackSupplier[] = parsed.valid.map((input) => {
    const externalId = input.id?.trim() || slugifySupplierId(input.name);
    const photoUrls = resolveAll(input.images ?? [], opts.baseUrl);
    const certImages = resolveAll(input.certificationImages ?? [], opts.baseUrl);
    const certs: PackCertification[] = (input.certifications ?? []).map((c) => ({ ...c }));
    certImages.forEach((url, i) => {
      if (certs[i] && !certs[i].imageUrl) certs[i].imageUrl = url;
      else certs.push({ name: `Certificate ${i + 1}`, imageUrl: url, sourceUrl: input.website ?? null });
    });
    return {
      externalId,
      input: { ...input, id: externalId, images: photoUrls, verificationStatus: "pending" },
      photoUrls,
      logoUrl: input.logoUrl ? resolvePackImageUrl(input.logoUrl, opts.baseUrl) : null,
      certifications: certs,
      productLines: input.products ?? [],
      sourceFormat: "csv",
    };
  });
  return {
    format: "csv",
    label: opts.label ?? "supplier-csv",
    generatedAt: null,
    suppliers,
    products: [],
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/**
 * Parse any supported payload (JSON string / parsed object / CSV text) into an
 * ImportPack. Throws only when the payload is unrecognisable.
 */
export function parseImportPayload(
  payload: unknown,
  opts: { label?: string; baseUrl?: string | null; contentType?: string | null } = {}
): ImportPack {
  let raw: unknown = payload;
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    const looksJson = trimmed.startsWith("{") || trimmed.startsWith("[");
    if (looksJson || (opts.contentType ?? "").includes("json")) {
      try {
        raw = JSON.parse(trimmed);
      } catch (err) {
        throw new Error(`Payload is not valid JSON: ${(err as Error).message}`);
      }
    } else {
      return parseCsvPack(payload, opts);
    }
  }

  const format = detectPackFormat(raw);
  if (format === "bundle") return parseBundlePack(raw, opts);
  if (format === "lister") return parseListerPack(raw, opts);
  throw new Error(
    "Unrecognised import payload. Expected a Lister daily pack ({suppliers:[{company_name…}], products:[{product_name…}]}), " +
      "a SupplierBundle ({supplierName, products:[…]}) or a supplier CSV."
  );
}

/** Merge several packs (e.g. suppliers.json + products.json) into one. */
export function mergePacks(packs: ImportPack[], label = "merged"): ImportPack {
  const byId = new Map<string, PackSupplier>();
  const products = new Map<string, PackProduct>();
  const warnings: string[] = [];
  for (const p of packs) {
    for (const s of p.suppliers) if (!byId.has(s.externalId)) byId.set(s.externalId, s);
    for (const pr of p.products) if (!products.has(pr.externalId)) products.set(pr.externalId, pr);
    warnings.push(...p.warnings);
  }
  // suppliers.json and products.json usually arrive as separate files: link
  // products to suppliers across packs (by slug, then by name) and inherit the
  // supplier's category when the product has none.
  const byName = new Map<string, PackSupplier>();
  for (const s of byId.values()) byName.set(s.input.name.trim().toLowerCase(), s);
  const linked = [...products.values()].map((pr) => {
    const sup = byId.get(pr.supplierExternalId) ?? byName.get(pr.supplierName.trim().toLowerCase());
    if (!sup) return pr;
    return {
      ...pr,
      supplierExternalId: sup.externalId,
      supplierName: sup.input.name,
      category: pr.category ?? normalizeCategory(sup.input.category),
    };
  });
  return {
    format: packs[0]?.format ?? "lister",
    label,
    generatedAt: packs.find((p) => p.generatedAt)?.generatedAt ?? null,
    suppliers: [...byId.values()],
    products: linked,
    warnings,
  };
}
