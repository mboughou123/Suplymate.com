#!/usr/bin/env node
/**
 * Build the static "pack catalogue" from the curated media packs.
 *
 * Inputs (all committed):
 *   scripts/import/phase1/suppliers-phase1-import.json + media-manifest.json
 *   data/daily-2026-09-0{2,3}-suppliers.json (+ *-manifest-suppliers*.json)
 *   data/daily-2026-09-10-cleared.json (+ docs/researcher-*-2026-09-10.json)
 *   data/daily-2026-09-11-mills-cleared.json + data/daily-2026-09-11-products-soft9.json
 *   data/hold30-mills-cleared.json (+ docs/researcher-hold30-mills-2026-09-10.json)
 *   data/hold30-refetch3-cleared.json (+ docs/researcher-hold30-refetch3-2026-09-10.json)
 *   data/hold35-products-cleared.json (+ docs/researcher-hold35-products-2026-09-10.json)
 *   data/hold35-refetch2-cleared.json
 *   data/product-media-batch{1,2,3}.json, data/product-gaps-fill*.json,
 *   data/daily-2026-09-0{2,3}-products.json (+ *enhanced-manifest*.json)
 *   data/certifications.json, data/certs-seed.tsv, data/*certs*manifest*.json
 *   data/product-media-batch3-skips.json, data/product-media-batch3-hadeed-attribution.json
 *   scripts/catalog/pack-config.json (curated slug → id hints, holds, aliases)
 *   public/images/** (every emitted path is verified on disk + magic bytes)
 *
 * Output: src/data/generated/pack-catalog.json — suppliers (with local logo /
 * factory photos / certificate scans), relational certifications and approved
 * products with local photo paths. Consumed by the no-DB fallback path
 * (src/lib/data-service.ts …) and by `scripts/seed-pack-media.ts` for the DB.
 *
 * Usage: node scripts/build-catalog-from-packs.mjs [--check]
 *   --check  exit 1 when the committed output differs from a fresh build.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(ROOT, "src", "data", "generated", "pack-catalog.json");

const config = readJson(path.join(ROOT, "scripts", "catalog", "pack-config.json"));

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJsonIfExists(file) {
  return fs.existsSync(file) ? readJson(file) : null;
}

export function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/×/g, "x")
    .replace(/[''`"]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(name) {
  return slugify(name)
    .replace(/-(limited|ltd|llc|inc|co|corp|corporation|company|group|plc|sa|ag|gmbh|pvt|private|pjsc|saog|q-p-s-c)(?=-|$)/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function domainOf(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** True when the file exists AND starts with real image magic bytes (no HTML stubs). */
export function isRealImageFile(absPath) {
  try {
    const fd = fs.openSync(absPath, "r");
    const buf = Buffer.alloc(12);
    const n = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    if (n < 4) return false;
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // JPEG
    if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return true; // PNG
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return true;
    return false;
  } catch {
    return false;
  }
}

/** `/images/...` public path → verified, or null when missing / not an image. */
function verifyPublicPath(publicPath) {
  if (!publicPath || !publicPath.startsWith("/images/")) return null;
  const abs = path.join(PUBLIC_DIR, publicPath);
  return isRealImageFile(abs) ? publicPath : null;
}

function listImageFiles(dirRel) {
  const abs = path.join(PUBLIC_DIR, dirRel);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => IMAGE_EXT.test(f))
    .sort()
    .map((f) => `/${path.posix.join(dirRel, f)}`);
}

function uniq(list) {
  return [...new Set(list.filter(Boolean))];
}

/** Drop leftover .webp/.png/.jpeg when an enhanced .jpg sibling exists. */
export function preferEnhancedJpegPaths(paths) {
  const set = new Set(paths);
  return paths.filter((p) => {
    if (/\.jpeg$/i.test(p) && set.has(p.replace(/\.jpeg$/i, ".jpg"))) return false;
    const m = p.match(/^(.*)\.(webp|png)$/i);
    if (!m) return true;
    const ext = m[2].toLowerCase();
    return !set.has(`${m[1]}.jpg`) && !set.has(`${m[1]}-${ext}.jpg`);
  });
}

/* ------------------------------------------------------------------ */
/* Path mapping for enhancer manifests                                 */
/* ------------------------------------------------------------------ */

const BUCKETS = ["steel", "cables", "tubes", "packaging", "construction", "industrial"];

/** Any manifest/workspace path → `/images/...` public path (or null). */
export function publicPathFromPackPath(raw) {
  const p = String(raw ?? "").trim().replace(/\\/g, "/");
  if (!p) return null;
  if (p.startsWith("/images/")) return p;
  let m = p.match(/(?:^|\/)public\/(images\/.+)$/);
  if (m) return `/${m[1]}`;
  // …/certs/<slug>/<file>
  m = p.match(/\/certs\/([^/]+)\/([^/]+\.(?:jpe?g|png|webp))$/i);
  if (m) return `/images/certs/${m[1]}/${m[2]}`;
  // …/(enhanced|images)/<bucket>/<supplier>/<file>  (Lister product media)
  m = p.match(new RegExp(`\\/(?:enhanced|images)\\/(${BUCKETS.join("|")})\\/([^/]+)\\/([^/]+\\.(?:jpe?g|png|webp))$`, "i"));
  if (m) return `/images/products/${m[1].toLowerCase()}/${m[2]}/${m[3]}`;
  // bare `<bucket>/<supplier>/<file>` (dst_rel)
  m = p.match(new RegExp(`^(${BUCKETS.join("|")})\\/([^/]+)\\/([^/]+\\.(?:jpe?g|png|webp))$`, "i"));
  if (m) return `/images/products/${m[1].toLowerCase()}/${m[2]}/${m[3]}`;
  // …/(enhanced|images)/products/<supplier>/<file>  (daily flat layout)
  m = p.match(/\/(?:enhanced|images)\/products\/([^/]+)\/([^/]+\.(?:jpe?g|png|webp))$/i);
  if (m) return `/images/products/${m[1]}/${m[2]}`;
  // …/(enhanced|images)/suppliers/<supplier>/<file>  (daily supplier stills)
  m = p.match(/\/(?:enhanced|images)\/suppliers\/([^/]+)\/([^/]+\.(?:jpe?g|png|webp))$/i);
  if (m) return `/images/suppliers/${m[1]}/${m[2]}`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Category vocab                                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_ALIASES = {
  "Steel & Metals": "Steel & Metals",
  "Tube & Pipes": "Tubes & Pipes",
  "Tubes & Pipes": "Tubes & Pipes",
  "Cables & Electrical": "Cables & Electrical",
  Construction: "Construction",
  "Industrial Parts": "Industrial Parts",
  "Hardware & Motion": "Industrial Parts",
  Packaging: "Packaging",
};

const INDUSTRY_BY_CATEGORY = {
  "Steel & Metals": "Metal",
  "Tubes & Pipes": "Metal",
  "Cables & Electrical": "Electrotechnical & Cabling",
  Construction: "Construction & BTP",
  "Industrial Parts": "Industrial Equipment",
  Packaging: "Plastics & Packaging",
};

const MOQ_BY_CATEGORY = {
  "Steel & Metals": "5 tons",
  "Cables & Electrical": "500 m",
  "Tubes & Pipes": "2 tons",
  Packaging: "2,000 units",
  Construction: "1 pallet",
  "Industrial Parts": "10 units",
};

const CATEGORY_BY_BUCKET = {
  steel: "Steel & Metals",
  cables: "Cables & Electrical",
  tubes: "Tubes & Pipes",
  packaging: "Packaging",
  construction: "Construction",
  industrial: "Industrial Parts",
};

const REGION_BY_COUNTRY = {
  "united arab emirates": "MENA", "saudi arabia": "MENA", qatar: "MENA", oman: "MENA", egypt: "MENA",
  morocco: "MENA", turkey: "MENA", india: "Asia", china: "Asia", japan: "Asia", "south korea": "Asia",
  taiwan: "Asia", thailand: "Asia", vietnam: "Asia", russia: "Europe", germany: "Europe", france: "Europe",
  spain: "Europe", italy: "Europe", sweden: "Europe", finland: "Europe", austria: "Europe", luxembourg: "Europe",
  netherlands: "Europe", belgium: "Europe", switzerland: "Europe", "united kingdom": "Europe", ireland: "Europe",
  denmark: "Europe", poland: "Europe", "czech republic": "Europe", "united states": "North America",
  canada: "North America", mexico: "North America", brazil: "Latin America", australia: "Oceania",
  nigeria: "Africa", "south africa": "Africa",
};

function toCategory(raw) {
  return CATEGORY_ALIASES[String(raw ?? "").trim()] ?? null;
}

function regionsFor(country, exportMarkets) {
  const base = REGION_BY_COUNTRY[String(country ?? "").toLowerCase()];
  const extra = Array.isArray(exportMarkets) ? exportMarkets : [];
  return uniq([base, ...extra]).slice(0, 6);
}

/* ------------------------------------------------------------------ */
/* Existing directory (dedupe target)                                  */
/* ------------------------------------------------------------------ */

/** Parse the generated Outscraper TS module (`= [ ...json ]`) without a TS toolchain. */
function loadOutscraperSuppliers() {
  const file = path.join(ROOT, "src", "data", "outscraper-suppliers.ts");
  if (!fs.existsSync(file)) return [];
  const src = fs.readFileSync(file, "utf8");
  const start = src.indexOf("=\n[");
  const end = src.lastIndexOf("\n]");
  if (start < 0 || end < 0) return [];
  try {
    return JSON.parse(src.slice(start + 2, end + 2));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Suppliers                                                           */
/* ------------------------------------------------------------------ */

const DISTRIBUTOR_SLUGS = new Set(config.distributors?.slugs ?? []);
const HOLD_KEYS = new Set(config.holds?.keys ?? []);
const SOFT_TUBE_PRODUCT_SLUGS = new Set(config.softTubeProductSlugs ?? []);
const SOFT_PRODUCT_IMAGE_CREDITS = config.softProductImageCredits ?? {};
const CATEGORY_FILL_CAPTION =
  "Photo is a generic Commons steel-pipe category fill — not a plant-exterior claim.";
const SOFT_TUBE_IMAGE_CREDIT =
  "Type-match Wikimedia Commons stock — not a mill-specific product still.";
const HOLD30_SOFT_CAPTION =
  "Photo is a Researcher-soft still — not a confirmed plant-exterior claim.";
const HOLD30_FOREVER_OUT = new Set(["rr-kabel"]);
/** Wienerberger: Researcher sealed `_01` only (no Holodomor/portrait secondaries). */
const SUPPLIER_IMAGE_ALLOW_ONLY = {
  wienerberger: new Set(["wienerberger_01.jpg"]),
};

function isHeld(supplierSlug, productSlug) {
  return HOLD_KEYS.has(supplierSlug) || HOLD_KEYS.has(`${supplierSlug}|${productSlug}`);
}

/**
 * Researcher seals for a cleared daily pack. HOLD slugs never enter the
 * catalogue; wire sets are the union of OK + SOFT. Category-fill mill notes
 * that start with SOFT get the generic-pipe caption (not a plant-exterior claim).
 */
function slugOf(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  return entry.slug ?? null;
}

function loadDaySeals(dateTag) {
  const mills = readJsonIfExists(path.join(ROOT, "docs", `researcher-mills-${dateTag}.json`));
  const products = readJsonIfExists(path.join(ROOT, "docs", `researcher-products-${dateTag}.json`));
  const millHolds = new Set(mills?.hold_do_not_wire ?? []);
  const productHolds = new Set((products?.hold ?? []).map((h) => (typeof h === "string" ? h : h.slug)));
  const millWire = new Set([...(mills?.sealed_wire_ok ?? []), ...(mills?.soft ?? [])]);
  const productWire = new Set([...(products?.ok ?? []), ...(products?.soft ?? [])]);
  const categoryFill = new Set(
    Object.entries(mills?.category_fill_notes ?? {})
      .filter(([, note]) => /^SOFT\b/i.test(String(note)))
      .map(([slug]) => slug)
  );
  return { millHolds, productHolds, millWire, productWire, categoryFill };
}

function localLogoFor(id) {
  const slug = config.logoSlugById?.[id];
  if (!slug) return null;
  return verifyPublicPath(`/images/suppliers/logos/logo-${slug}.png`);
}

// Visual QA excludes for supplier galleries: Wikimedia/marketing pulls that are
// not the company's facility or product (blank colour swatches, unrelated books
// and letters, executive portraits, wind farms, ESG banners, award badges, maps).
// Paths relative to /images/suppliers/.
const SUPPLIER_IMAGE_EXCLUDES = new Set(
  (config.supplierImageExcludes ?? []).map((rel) => `/images/suppliers/${rel}`)
);
function notExcludedSupplierImage(pub) {
  return !SUPPLIER_IMAGE_EXCLUDES.has(pub);
}

function allowedSupplierImages(slug, images) {
  const allow = SUPPLIER_IMAGE_ALLOW_ONLY[slug];
  if (!allow) return images;
  return images.filter((pub) => allow.has(path.posix.basename(pub)));
}

function buildPhase1Suppliers(report) {
  const entries = readJson(path.join(ROOT, "scripts", "import", "phase1", "suppliers-phase1-import.json"));
  const manifest = readJsonIfExists(path.join(ROOT, "scripts", "import", "phase1", "media-manifest.json"));
  const manifestByName = new Map((manifest?.suppliers ?? []).map((m) => [m.name, m]));

  return entries.map((e) => {
    const category = toCategory(e.category) ?? "Industrial Parts";
    const id = config.phase1IdByName?.[e.name] ?? slugify(e.name);
    const mf = manifestByName.get(e.name);
    const images = preferEnhancedJpegPaths(
      uniq([...(mf?.local_paths ?? []), ...(e.images ?? []), ...String(e.photoUrls ?? "").split("|")])
        .map((p) => (p.startsWith("/images/") ? p : publicPathFromPackPath(p)))
        .map(verifyPublicPath)
        .filter(Boolean)
        .filter(notExcludedSupplierImage)
    );
    if (images.length === 0) report.suppliersWithoutPhotos.push(id);
    // Curated hero beats the manifest hero (which may be a QA-excluded or
    // non-production shot); otherwise the first surviving image.
    const curatedHero = config.supplierHeroById?.[id];
    const hero = images.includes(curatedHero)
      ? curatedHero
      : images.includes(mf?.hero)
        ? mf.hero
        : images[0];
    const certificationsDetailed = (e.certifications ?? [])
      .map((c) => (typeof c === "string" ? { name: c } : { name: c?.name }))
      .filter((c) => c.name && c.name.trim())
      .map((c) => ({ name: c.name.trim() }));
    return {
      id,
      packSlug: id,
      pack: "phase1",
      name: e.name,
      industry: INDUSTRY_BY_CATEGORY[category],
      category,
      location: [e.city, e.country].filter(Boolean).join(", "),
      country: e.country ?? undefined,
      city: e.city ?? undefined,
      website: e.website ?? undefined,
      phone: e.phone ?? undefined,
      email: e.email ?? undefined,
      address: e.address ?? undefined,
      // Local logos only — hotlinked third-party logos are not part of the
      // curated asset set (and their hosts are not in next.config remotePatterns).
      logoUrl: localLogoFor(id) ?? undefined,
      imageUrl: hero,
      supplierImages: images,
      description: e.description ?? undefined,
      products: Array.isArray(e.products) ? e.products : [],
      deliveryRegions: regionsFor(e.country),
      moq: e.moq || MOQ_BY_CATEGORY[category],
      googleRating: e.rating ?? undefined,
      googleReviews: e.reviewCount ?? undefined,
      verified: true,
      verificationStatus: "verified",
      sourceUrl: e.sourceUrl ?? e.website ?? undefined,
      certificationsDetailed,
      certificationImages: [],
      lastUpdated: "2026-09-01",
      score: 92,
      reliabilityScore: 92,
    };
  });
}

function buildDailySuppliers(dateTag, report) {
  const raw = readJson(path.join(DATA_DIR, `daily-${dateTag}-suppliers.json`));
  // Enhancer manifests (dst = enhanced still) are preferred over raw local_images.
  const manifestPaths = new Map();
  for (const name of fs.readdirSync(DATA_DIR)) {
    if (!name.startsWith(`daily-${dateTag}-manifest-suppliers`)) continue;
    for (const row of readJson(path.join(DATA_DIR, name))) {
      const pub = publicPathFromPackPath(row.dst ?? row.src);
      if (!pub) continue;
      const slug = row.slug ?? pub.split("/")[3];
      const list = manifestPaths.get(slug) ?? [];
      list.push(pub);
      manifestPaths.set(slug, list);
    }
  }

  return (raw.suppliers ?? []).map((m) => {
    const slug = m.slug || slugify(m.company_name);
    const category = toCategory(m.primary_category) ?? "Industrial Parts";
    const id = config.supplierIdBySlug?.[slug] ?? slug;
    const images = preferEnhancedJpegPaths(
      uniq([
        ...(manifestPaths.get(slug) ?? []),
        ...(m.local_images ?? []).map(publicPathFromPackPath),
        ...listImageFiles(`images/suppliers/${slug}`),
      ])
        .map(verifyPublicPath)
        .filter(Boolean)
        .filter(notExcludedSupplierImage)
    );
    if (images.length === 0) report.suppliersWithoutPhotos.push(id);
    const isDistributor = DISTRIBUTOR_SLUGS.has(slug);
    const city = String(m.city ?? "").split(",")[0].trim() || undefined;
    let description = String(m.description ?? "").trim();
    const note = config.descriptionNotes?.[slug];
    if (note) description = description ? `${description} ${note}` : note;
    if (isDistributor) {
      const d =
        "Listed as a distributor / logistics partner (not a producing mill); Suplymate does not present this company as a verified manufacturer.";
      description = description ? `${description} ${d}` : d;
    }
    return {
      id,
      packSlug: slug,
      pack: `daily-${dateTag}`,
      name: m.company_name,
      industry: INDUSTRY_BY_CATEGORY[category],
      category,
      location: [city, m.country].filter(Boolean).join(", "),
      country: m.country ?? undefined,
      city,
      website: m.website ?? undefined,
      logoUrl: localLogoFor(id) ?? undefined,
      imageUrl: images.includes(config.supplierHeroById?.[id]) ? config.supplierHeroById[id] : images[0],
      supplierImages: images,
      description: description || undefined,
      products: Array.isArray(m.product_lines) ? m.product_lines : [],
      deliveryRegions: regionsFor(m.country, m.export_markets),
      moq: /not published/i.test(m.moq ?? "") || !m.moq ? "Not published — mill RFQ" : m.moq,
      verified: !isDistributor,
      verificationStatus: isDistributor ? undefined : "verified",
      businessType: isDistributor ? "Distributor" : "Manufacturer",
      sourceUrl: m.source_url || m.website || undefined,
      // Research-note certification claims ("confirm current certificate…")
      // are deliberately NOT surfaced as badges; only scanned certificates are.
      certificationsDetailed: [],
      certificationImages: [],
      lastUpdated: dateTag,
      score: isDistributor ? 72 : 90,
      reliabilityScore: isDistributor ? 72 : 90,
    };
  });
}

/**
 * Researcher-cleared combined daily pack (`data/daily-<date>-cleared.json`).
 * Mills on the seal HOLD list are omitted from the public directory. Products
 * whose mill is HOLD still get a product-host identity (no mill stills) so the
 * RFQ SKU can list without wiring the mill card.
 */
function buildClearedDailySuppliers(dateTag, report) {
  const raw = readJsonIfExists(path.join(DATA_DIR, `daily-${dateTag}-cleared.json`));
  if (!raw) return [];
  const seals = loadDaySeals(dateTag);
  const allow = new Set([...(raw.mills_ok ?? []), ...(raw.mills_soft ?? []), ...seals.millWire]);
  const rows = [];
  for (const m of raw.suppliers ?? []) {
    const slug = m.slug || slugify(m.company_name);
    if (seals.millHolds.has(slug)) continue;
    if (allow.size && !allow.has(slug)) continue;
    rows.push(m);
  }
  return rows.map((m) => {
    const slug = m.slug || slugify(m.company_name);
    const category = toCategory(m.primary_category) ?? "Industrial Parts";
    const id = config.supplierIdBySlug?.[slug] ?? slug;
    const images = preferEnhancedJpegPaths(
      uniq([
        ...(m.local_images ?? []).map(publicPathFromPackPath),
        ...listImageFiles(`images/suppliers/${slug}`),
      ])
        .map(verifyPublicPath)
        .filter(Boolean)
        .filter(notExcludedSupplierImage)
    );
    if (images.length === 0) report.suppliersWithoutPhotos.push(id);
    const city = String(m.city ?? "").split(",")[0].trim() || undefined;
    let description = String(m.description ?? "").trim();
    const note = config.descriptionNotes?.[slug];
    if (note) description = description ? `${description} ${note}` : note;
    if (seals.categoryFill.has(slug) && !description.includes("not a plant-exterior")) {
      description = description ? `${description} ${CATEGORY_FILL_CAPTION}` : CATEGORY_FILL_CAPTION;
    }
    return {
      id,
      packSlug: slug,
      pack: `daily-${dateTag}`,
      name: m.company_name,
      industry: INDUSTRY_BY_CATEGORY[category],
      category,
      location: [city, m.country].filter(Boolean).join(", "),
      country: m.country ?? undefined,
      city,
      website: m.website ?? undefined,
      logoUrl: localLogoFor(id) ?? undefined,
      imageUrl: images.includes(config.supplierHeroById?.[id]) ? config.supplierHeroById[id] : images[0],
      supplierImages: images,
      description: description || undefined,
      products: Array.isArray(m.product_lines) ? m.product_lines : [],
      deliveryRegions: regionsFor(m.country, m.export_markets),
      moq: /not published/i.test(m.moq ?? "") || !m.moq ? "Not published — mill RFQ" : m.moq,
      verified: true,
      verificationStatus: "verified",
      businessType: "Manufacturer",
      sourceUrl: m.source_url || m.website || undefined,
      certificationsDetailed: [],
      certificationImages: [],
      lastUpdated: dateTag,
      score: 90,
      reliabilityScore: 90,
    };
  });
}

/** Identity-only hosts for RFQ products whose mill card is Researcher-HOLD. */
function buildClearedProductHosts(dateTag, wiredSlugs, report) {
  const raw = readJsonIfExists(path.join(DATA_DIR, `daily-${dateTag}-cleared.json`));
  if (!raw) return [];
  const seals = loadDaySeals(dateTag);
  const allow = new Set([...(raw.products_ok ?? []), ...(raw.products_soft ?? []), ...seals.productWire]);
  const seen = new Set();
  const hosts = [];
  for (const sku of raw.products ?? []) {
    const slug = sku.supplier_slug_guess || slugify(sku.supplier_name);
    if (seen.has(slug) || wiredSlugs.has(slug)) continue;
    if (seals.productHolds.has(slug)) continue;
    if (allow.size && !allow.has(slug)) continue;
    seen.add(slug);
    const category = toCategory(sku.category) ?? "Industrial Parts";
    const id = config.supplierIdBySlug?.[slug] ?? slug;
    hosts.push({
      id,
      packSlug: slug,
      pack: `daily-${dateTag}`,
      name: sku.supplier_name,
      industry: INDUSTRY_BY_CATEGORY[category],
      category,
      website: sku.source_url || undefined,
      description:
        "Listed as an RFQ product host only. The mill still was held by Researcher QA and is not wired as a plant card.",
      products: [sku.product_name],
      deliveryRegions: [],
      moq: "Not published — mill RFQ",
      verified: false,
      verificationStatus: "needs_info",
      businessType: "Manufacturer",
      sourceUrl: sku.source_url || undefined,
      certificationsDetailed: [],
      certificationImages: [],
      lastUpdated: dateTag,
      score: 70,
      reliabilityScore: 70,
      productHostOnly: true,
    });
    report.suppliersWithoutPhotos.push(id);
  }
  return hosts;
}

/**
 * HOLD30 re-QA mill pack (`data/hold30-mills-cleared.json`) plus refetch3
 * (`data/hold30-refetch3-cleared.json`). Gated by the matching Researcher
 * seals. Appends the cleared 29 (OK + soft) without rewriting the locked
 * daily 2026-09-10 twenty. rr-kabel stays out forever.
 */
function loadHold30Seals() {
  const mills = readJsonIfExists(path.join(ROOT, "docs", "researcher-hold30-mills-2026-09-10.json"));
  const pack = readJsonIfExists(path.join(DATA_DIR, "hold30-mills-cleared.json"));
  const refetch = readJsonIfExists(path.join(DATA_DIR, "hold30-refetch3-cleared.json"));
  const refetchSeal = readJsonIfExists(path.join(ROOT, "docs", "researcher-hold30-refetch3-2026-09-10.json"));
  const refetchWire = new Set(
    [
      ...(refetch?.ok ?? []),
      ...(refetch?.soft ?? []),
      ...(refetchSeal?.sealed_wire_ok ?? []),
      ...(refetchSeal?.soft ?? []).map(slugOf),
    ].filter(Boolean)
  );
  const millHolds = new Set([
    ...HOLD30_FOREVER_OUT,
    ...(pack?.hold_out ?? []),
    ...(mills?.hold_do_not_wire ?? []).map(slugOf).filter(Boolean),
    ...(mills?.blocked_skipped ?? []),
    ...(refetchSeal?.blocked_skipped ?? []),
  ]);
  for (const slug of refetchWire) millHolds.delete(slug);
  const millWire = new Set(
    [
      ...(pack?.mills_ok ?? []),
      ...(pack?.mills_soft ?? []),
      ...(mills?.sealed_wire_ok ?? []),
      ...(mills?.soft ?? []).map(slugOf),
      ...refetchWire,
    ].filter((slug) => slug && !millHolds.has(slug))
  );
  const softSlugs = new Set(
    [
      ...(pack?.mills_soft ?? []),
      ...(mills?.soft ?? []).map(slugOf),
      ...(refetch?.soft ?? []),
      ...(refetchSeal?.soft ?? []).map(slugOf),
    ].filter((slug) => slug && millWire.has(slug))
  );
  return { millHolds, millWire, softSlugs };
}

function buildHold30Suppliers(report) {
  const raw = readJsonIfExists(path.join(DATA_DIR, "hold30-mills-cleared.json"));
  const refetch = readJsonIfExists(path.join(DATA_DIR, "hold30-refetch3-cleared.json"));
  const listed = [...(raw?.suppliers ?? []), ...(refetch?.suppliers ?? [])];
  if (!listed.length) return [];
  const seals = loadHold30Seals();
  const rows = [];
  for (const m of listed) {
    const slug = m.slug || slugify(m.company_name);
    if (seals.millHolds.has(slug)) continue;
    if (seals.millWire.size && !seals.millWire.has(slug)) continue;
    rows.push(m);
  }
  return rows.map((m) => {
    const slug = m.slug || slugify(m.company_name);
    const category = toCategory(m.primary_category) ?? "Industrial Parts";
    const id = config.supplierIdBySlug?.[slug] ?? slug;
    const images = preferEnhancedJpegPaths(
      uniq([
        ...(m.local_images ?? []).map(publicPathFromPackPath),
        ...listImageFiles(`images/suppliers/${slug}`),
      ])
        .map(verifyPublicPath)
        .filter(Boolean)
        .filter(notExcludedSupplierImage)
    );
    if (images.length === 0) report.suppliersWithoutPhotos.push(id);
    const city = String(m.city ?? "").split(",")[0].trim() || undefined;
    let description = String(m.description ?? "").trim();
    const note = config.descriptionNotes?.[slug];
    if (note) description = description ? `${description} ${note}` : note;
    else if (seals.softSlugs.has(slug)) {
      description = description ? `${description} ${HOLD30_SOFT_CAPTION}` : HOLD30_SOFT_CAPTION;
    }
    return {
      id,
      packSlug: slug,
      pack: "hold30-2026-09-10",
      name: m.company_name,
      industry: INDUSTRY_BY_CATEGORY[category],
      category,
      location: [city, m.country].filter(Boolean).join(", "),
      country: m.country ?? undefined,
      city,
      website: m.website ?? undefined,
      logoUrl: localLogoFor(id) ?? undefined,
      imageUrl: images.includes(config.supplierHeroById?.[id]) ? config.supplierHeroById[id] : images[0],
      supplierImages: images,
      description: description || undefined,
      products: Array.isArray(m.product_lines) ? m.product_lines : [],
      deliveryRegions: regionsFor(m.country, m.export_markets),
      moq: /not published/i.test(m.moq ?? "") || !m.moq ? "Not published — mill RFQ" : m.moq,
      verified: true,
      verificationStatus: "verified",
      businessType: "Manufacturer",
      sourceUrl: m.source_url || m.website || undefined,
      certificationsDetailed: [],
      certificationImages: [],
      lastUpdated: "2026-09-10",
      score: 90,
      reliabilityScore: 90,
    };
  });
}

/**
 * Researcher-cleared 2026-09-11 daily pack. Seals live on the committed
 * stills manifests (`wire_ok` / `soft`); HOLD slugs never enter the
 * directory. HARD-SKIP12 plant re-fetches are not Researcher re-QAd and
 * stay out. Prior wired packs stay locked — this only appends.
 */
function loadDaily0911Seals() {
  const mills = readJsonIfExists(path.join(DATA_DIR, "daily-2026-09-11-mills-cleared.json"));
  const products = readJsonIfExists(path.join(DATA_DIR, "daily-2026-09-11-products-soft9.json"));
  const millWire = new Set(
    [...(mills?.wire_ok ?? []), ...(mills?.soft ?? []).map(slugOf)].filter(Boolean)
  );
  const millSoft = new Set((mills?.soft ?? []).map(slugOf).filter(Boolean));
  const productWire = new Set(
    [...(products?.wire_ok ?? []), ...(products?.soft ?? []).map(slugOf)].filter(Boolean)
  );
  return { millWire, millSoft, productWire, mills, products };
}

function normalizeClearedSku(sku) {
  const supplierSlug = sku.supplier_slug_guess || sku.slug || slugify(sku.supplier_name);
  return {
    ...sku,
    supplier_slug_guess: supplierSlug,
    local_images: sku.local_images ?? sku.image_paths ?? [],
    unit_price: sku.unit_price ?? null,
    price_source_type: sku.price_source_type ?? "rfq",
    needs_ai_generate: 0,
  };
}

function millRowsFromStillsPack(pack, millWire) {
  if (pack?.suppliers?.length) {
    return pack.suppliers.filter((m) => millWire.has(m.slug || slugify(m.company_name)));
  }
  const identities = config.millIdentityBySlug ?? {};
  const stillsBySlug = new Map();
  for (const still of pack?.stills ?? []) {
    if (!still?.slug || !still?.path) continue;
    const list = stillsBySlug.get(still.slug) ?? [];
    list.push(still.path);
    stillsBySlug.set(still.slug, list);
  }
  return [...millWire].map((slug) => {
    const identity = identities[slug] ?? {};
    return {
      slug,
      company_name: identity.company_name ?? slug,
      primary_category: identity.primary_category,
      country: identity.country,
      city: identity.city,
      website: identity.website,
      description: identity.description,
      product_lines: identity.product_lines ?? [],
      local_images: stillsBySlug.get(slug) ?? [],
      source_url: identity.website,
      moq: "Not published — mill RFQ / project quote (no public unit MOQ; do not invent)",
      export_markets: identity.export_markets ?? [],
    };
  });
}

function buildDaily0911Suppliers(report) {
  const seals = loadDaily0911Seals();
  if (!seals.millWire.size) return [];
  return millRowsFromStillsPack(seals.mills, seals.millWire).map((m) => {
    const slug = m.slug || slugify(m.company_name);
    const category = toCategory(m.primary_category) ?? "Industrial Parts";
    const id = config.supplierIdBySlug?.[slug] ?? slug;
    const images = allowedSupplierImages(
      slug,
      preferEnhancedJpegPaths(
        uniq([
          ...(m.local_images ?? []).map(publicPathFromPackPath),
          ...listImageFiles(`images/suppliers/${slug}`),
        ])
          .map(verifyPublicPath)
          .filter(Boolean)
          .filter(notExcludedSupplierImage)
      )
    );
    if (images.length === 0) report.suppliersWithoutPhotos.push(id);
    const city = String(m.city ?? "").split(",")[0].trim() || undefined;
    let description = String(m.description ?? "").trim();
    const note = config.descriptionNotes?.[slug];
    if (note) description = description ? `${description} ${note}` : note;
    else if (seals.millSoft.has(slug) && !/not a plant-exterior/i.test(description)) {
      description = description
        ? `${description} ${CATEGORY_FILL_CAPTION}`
        : CATEGORY_FILL_CAPTION;
    }
    return {
      id,
      packSlug: slug,
      pack: "daily-2026-09-11",
      name: m.company_name,
      industry: INDUSTRY_BY_CATEGORY[category],
      category,
      location: [city, m.country].filter(Boolean).join(", "),
      country: m.country ?? undefined,
      city,
      website: m.website ?? undefined,
      logoUrl: localLogoFor(id) ?? undefined,
      imageUrl: images.includes(config.supplierHeroById?.[id]) ? config.supplierHeroById[id] : images[0],
      supplierImages: images,
      description: description || undefined,
      products: Array.isArray(m.product_lines) ? m.product_lines : [],
      deliveryRegions: regionsFor(m.country, m.export_markets),
      moq: /not published/i.test(m.moq ?? "") || !m.moq ? "Not published — mill RFQ" : m.moq,
      verified: true,
      verificationStatus: "verified",
      businessType: "Manufacturer",
      sourceUrl: m.source_url || m.website || undefined,
      certificationsDetailed: [],
      certificationImages: [],
      lastUpdated: "2026-09-11",
      score: 90,
      reliabilityScore: 90,
    };
  });
}

/** Identity-only hosts for 2026-09-11 RFQ products whose mill card is HOLD. */
function buildDaily0911ProductHosts(wiredSlugs, report) {
  const seals = loadDaily0911Seals();
  if (!seals.products) return [];
  const seen = new Set();
  const hosts = [];
  for (const sku of (seals.products.products ?? []).map(normalizeClearedSku)) {
    const slug = sku.supplier_slug_guess;
    if (seen.has(slug) || wiredSlugs.has(slug)) continue;
    if (seals.productWire.size && !seals.productWire.has(slug)) continue;
    seen.add(slug);
    const category = toCategory(sku.category) ?? "Industrial Parts";
    const id = config.supplierIdBySlug?.[slug] ?? slug;
    hosts.push({
      id,
      packSlug: slug,
      pack: "daily-2026-09-11",
      name: sku.supplier_name,
      industry: INDUSTRY_BY_CATEGORY[category],
      category,
      website: sku.source_url || undefined,
      description:
        "Listed as an RFQ product host only. The mill still was held by Researcher QA and is not wired as a plant card.",
      products: [sku.product_name],
      deliveryRegions: [],
      moq: "Not published — mill RFQ",
      verified: false,
      verificationStatus: "needs_info",
      businessType: "Manufacturer",
      sourceUrl: sku.source_url || undefined,
      certificationsDetailed: [],
      certificationImages: [],
      lastUpdated: "2026-09-11",
      score: 70,
      reliabilityScore: 70,
      productHostOnly: true,
    });
    report.suppliersWithoutPhotos.push(id);
  }
  return hosts;
}

/* ------------------------------------------------------------------ */
/* Certificates                                                        */
/* ------------------------------------------------------------------ */

const CERT_ACRONYMS = /^(API|ISO|IEC|CE|UL|BIS|PED|TUV|CARES|IATF|ASTM|EN|HSE|CQM|ACRS|FM|ROHS|BASEC|Q1|NABL|LVD|LOC|EMC|OHSAS|AD|SASO|ESMA|KUCAS|DCL|ADNOC|AS|NZS|GOST|CRN|ABS|DNV|LR|BV|CCS|CPR|ERW|LSAW|HFW|AAP|PCMS|IBR|SGS)$/;

export function certNameFromFilename(filename) {
  const stem = filename.replace(IMAGE_EXT, "");
  return stem
    .split("-")
    .filter(Boolean)
    .map((part) => {
      const upper = part.toUpperCase();
      if (CERT_ACRONYMS.test(upper)) return upper;
      if (/^\d+[a-z]+$/i.test(part)) return upper; // 5L, 2B, 5CT
      if (/^\d/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function readCertsSeedTsv() {
  const file = path.join(DATA_DIR, "certs-seed.tsv");
  if (!fs.existsSync(file)) return new Map();
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split("\t");
  const idx = (k) => header.indexOf(k);
  const out = new Map();
  for (const line of lines.slice(1)) {
    const cols = line.split("\t");
    const name = cols[idx("mill_name")];
    if (!name) continue;
    out.set(name, {
      website: cols[idx("website")] || null,
      certNames: (cols[idx("cert_names")] || "").split("|").filter(Boolean),
      certPageUrl: cols[idx("cert_page_url")] || null,
    });
  }
  return out;
}

function buildCertifications(suppliersById, report) {
  const index = readJsonIfExists(path.join(DATA_DIR, "certifications.json"));
  const metaByFile = new Map();
  for (const row of index?.found ?? []) {
    if (row.status && row.status !== "found") continue;
    const pub = publicPathFromPackPath(row.local_path);
    if (!pub) continue;
    metaByFile.set(pub, row);
  }
  // Enhancer manifests can reference scans that certifications.json predates.
  for (const name of fs.readdirSync(DATA_DIR)) {
    if (!/certs.*manifest.*\.json$/i.test(name) && !/manifest-certs/i.test(name)) continue;
    for (const row of readJson(path.join(DATA_DIR, name))) {
      const pub = publicPathFromPackPath(row.dst ?? row.dst_rel ?? row.src);
      if (pub && !metaByFile.has(pub)) metaByFile.set(pub, { supplier_slug: pub.split("/")[3] });
    }
  }

  const tsv = readCertsSeedTsv();
  const blocked = new Set(config.certBlockedSlugs ?? []);
  const excludes = config.certFileExcludes ?? {};
  const certs = [];
  const certsRoot = path.join(PUBLIC_DIR, "images", "certs");
  if (!fs.existsSync(certsRoot)) return certs;

  for (const slug of fs.readdirSync(certsRoot).sort()) {
    if (blocked.has(slug)) {
      report.certSlugsBlocked.push(slug);
      continue;
    }
    const supplierId =
      config.certSupplierIdBySlug?.[slug] ?? config.supplierIdBySlug?.[slug] ?? slug;
    const supplier = suppliersById.get(supplierId);
    if (!supplier) {
      report.certSlugsUnresolved.push(slug);
      continue;
    }
    const seed = tsv.get(supplier.name);
    for (const pub of listImageFiles(`images/certs/${slug}`)) {
      const file = pub.split("/").pop();
      if ((excludes[slug] ?? []).some((pat) => file.toLowerCase().includes(pat.toLowerCase()))) continue;
      if (!verifyPublicPath(pub)) {
        report.badImageFiles.push(pub);
        continue;
      }
      const meta = metaByFile.get(pub) ?? {};
      const name = (meta.cert_name && meta.cert_name.trim()) || certNameFromFilename(file);
      certs.push({
        id: `cert-${slug}-${file.replace(IMAGE_EXT, "")}`,
        supplierId,
        name,
        type: meta.cert_type ?? inferCertType(name),
        imageUrl: pub,
        certificateUrl: meta.image_url && /^https?:/.test(meta.image_url) ? meta.image_url : null,
        sourceUrl: meta.source_url ?? seed?.certPageUrl ?? supplier.website ?? null,
        issuingOrg: issuingOrgFor(name),
        notes: meta.notes || null,
        status: "claimed",
      });
    }
  }
  return certs;
}

function inferCertType(name) {
  const m = name.match(/\b(API(?:\s?\w+)?|ISO(?:\/IEC)?\s?\d+|IATF\s?\d+|CE|UL|BIS|CARES|ACRS|PED|FM|RoHS|ASTM|EN\s?\d+|OHSAS\s?\d+|SASO|ADNOC)\b/i);
  return m ? m[1].replace(/\s+/g, "_").toUpperCase() : null;
}

function issuingOrgFor(name) {
  const n = name.toLowerCase();
  if (/\bapi\b/.test(n)) return "American Petroleum Institute";
  if (/\biso\b|\biec\b/.test(n)) return "ISO-accredited certification body";
  if (/\biatf\b/.test(n)) return "IATF";
  if (/\bcares\b/.test(n)) return "UK CARES";
  if (/\bacrs\b/.test(n)) return "ACRS";
  if (/\bbis\b/.test(n)) return "Bureau of Indian Standards";
  if (/\bul\b/.test(n)) return "UL Solutions";
  if (/\bfm\b/.test(n)) return "FM Approvals";
  if (/\bce\b|\bcpr\b/.test(n)) return "EU notified body";
  return null;
}

/* ------------------------------------------------------------------ */
/* Product image assignment (stem scoring + curated aliases)          */
/* ------------------------------------------------------------------ */

const STOP_TOKENS = new Set(["and", "for", "the", "of", "with", "from", "per"]);

function tokens(slug) {
  return new Set(slug.split("-").filter((t) => t.length > 1 && !STOP_TOKENS.has(t)));
}

function stemOf(filename) {
  return filename.replace(IMAGE_EXT, "").replace(/-\d+$/, "");
}

function variantIndex(filename) {
  const m = filename.match(/-(\d+)\.(jpe?g|png|webp)$/i);
  return m ? Number(m[1]) : 0;
}

function scoreStem(stem, slug, nameSlug, supplierTokens = new Set()) {
  if (stem === slug || stem === nameSlug) return 1000;
  if (nameSlug.startsWith(stem) || stem.startsWith(nameSlug)) {
    return 500 + Math.min(stem.length, nameSlug.length);
  }
  // Brand tokens ("tata", "jsw") appear in every SKU of a folder and must not
  // make a file look related to a product it has nothing to do with.
  const a = new Set([...tokens(stem)].filter((t) => !supplierTokens.has(t)));
  const b = new Set([...tokens(nameSlug)].filter((t) => !supplierTokens.has(t)));
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  if (shared === 0) return 0;
  const first = stem.split("-")[0] ?? "";
  const firstHits = supplierTokens.has(first) ? 0 : nameSlug.split("-").filter((t) => t === first).length;
  const substringBonus = nameSlug.includes(stem) ? 40 : 0;
  return (shared / Math.max(a.size, b.size)) * 100 + shared * 10 + firstHits * 15 + substringBonus;
}

/**
 * Assign the files of ONE supplier folder to that supplier's products.
 * rows: [{ id, slug, nameSlug }], files: public paths inside the folder.
 * Returns Map<rowId, publicPath[]>.
 */
export function assignFolderImages(rows, files, supplierSlug, aliases = {}, extraStems = {}) {
  const supplierTokens = tokens(supplierSlug);
  const byStem = new Map();
  for (const pub of files) {
    const file = pub.split("/").pop();
    const stem = stemOf(file);
    const list = byStem.get(stem) ?? [];
    list.push(pub);
    byStem.set(stem, list);
  }
  const pathsForStem = (stem) =>
    [...(byStem.get(stem) ?? [])].sort(
      (a, b) => variantIndex(a.split("/").pop()) - variantIndex(b.split("/").pop())
    );

  const assigned = new Map();
  const claimed = new Set();

  // 1. Curated aliases: `<supplierSlug>/<productSlug>` → filename stem.
  for (const row of rows) {
    const alias = aliases[`${supplierSlug}/${row.slug}`] ?? aliases[`${supplierSlug}/${row.nameSlug}`];
    if (!alias) continue;
    for (const stem of [alias, `${alias}-png`, `${alias}-webp`, `${alias}-jpeg`]) {
      if (byStem.has(stem) && !claimed.has(stem)) {
        claimed.add(stem);
        assigned.set(row.id, pathsForStem(stem));
        break;
      }
    }
  }

  // 2. Best-scoring unclaimed stem per remaining product (greedy, best first).
  const ranked = rows
    .filter((row) => !assigned.has(row.id))
    .map((row) => {
      let bestStem = null;
      let bestScore = -1;
      for (const stem of byStem.keys()) {
        if (claimed.has(stem)) continue;
        const sc = scoreStem(stem, row.slug, row.nameSlug, supplierTokens);
        if (sc > bestScore) {
          bestScore = sc;
          bestStem = stem;
        }
      }
      return { row, bestStem, bestScore };
    })
    .sort((a, b) => b.bestScore - a.bestScore);
  for (const item of ranked) {
    if (item.bestStem && item.bestScore > 20 && !claimed.has(item.bestStem)) {
      claimed.add(item.bestStem);
      assigned.set(item.row.id, pathsForStem(item.bestStem));
    } else if (!assigned.has(item.row.id)) {
      assigned.set(item.row.id, []);
    }
  }

  // 3. Leftover stems: curated extra-stem hints, else attach to best match as extras.
  const rowBySlug = new Map(rows.flatMap((r) => [[r.slug, r], [r.nameSlug, r]]));
  for (const [stem, filesForStem] of byStem) {
    if (claimed.has(stem)) continue;
    const hint = extraStems[`${supplierSlug}/${stem}`] ?? extraStems[`${supplierSlug}/${stem.replace(/-\d+$/, "")}`];
    let target = hint ? rowBySlug.get(hint) : null;
    if (!target) {
      let bestScore = -1;
      for (const row of rows) {
        const sc = scoreStem(stem, row.slug, row.nameSlug, supplierTokens);
        if (sc > bestScore) {
          bestScore = sc;
          target = row;
        }
      }
      if (bestScore <= 20) target = null;
    }
    if (!target) continue;
    const current = assigned.get(target.id) ?? [];
    assigned.set(target.id, uniq([...current, ...filesForStem]));
  }

  return assigned;
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

const PRICED_SOURCE_TYPES = new Set([
  "dealer_list", "printed_mrp", "mill_estimate", "mill_list", "listed_fob",
  "retail_eshop", "marketplace_listing", "listed_public", "public_listing",
]);

const PRICE_SOURCE_LABELS = {
  dealer_list: "Dealer list price (not mill FOB)",
  printed_mrp: "Printed MRP (not a dealer quote)",
  mill_estimate: "Mill estimate (not a firm FOB offer)",
  mill_list: "Published mill list price",
  listed_fob: "Listed FOB — confirm with the mill",
  retail_eshop: "Retail / e-shop price (not mill FOB)",
  marketplace_listing: "Marketplace listing (not mill FOB)",
  listed_public: "Public listing (not mill FOB)",
  public_listing: "Public listing (not mill FOB)",
  rfq: "RFQ — no public price",
};

function moqFromNote(note, fallback) {
  const m = String(note ?? "").match(/MOQ\s+(\d[\d,]*(?:\.\d+)?\s+[A-Za-z /]+?)(?:[.;,]|$)/i);
  return m ? m[1].trim() : fallback ?? null;
}

function priceUnitOf(unit) {
  if (!unit) return null;
  return String(unit).replace(/^per\s+/i, "").trim() || null;
}

/** Load every product pack as `{ packId, scrapedAt, skus: [{ raw, bucket }] }`. */
function loadProductPacks() {
  const packs = [];
  const batchMeta = [
    ["product-media-batch1.json", "b1", "2026-09-02T12:00:00.000Z"],
    ["product-media-batch2.json", "b2", "2026-09-02T12:30:00.000Z"],
    ["product-media-batch3.json", "b3", "2026-09-02T13:00:00.000Z"],
  ];
  for (const [file, packId, scrapedAt] of batchMeta) {
    const raw = readJsonIfExists(path.join(DATA_DIR, file));
    if (!raw) continue;
    const skus = [];
    for (const [bucket, items] of Object.entries(raw)) {
      if (!Array.isArray(items)) continue;
      for (const sku of items) skus.push({ raw: sku, bucket });
    }
    packs.push({ packId, scrapedAt, skus });
  }
  for (const [file, packId, scrapedAt] of [
    ["product-gaps-fill.json", "gf1", "2026-09-02T14:00:00.000Z"],
    ["product-gaps-fill-2.json", "gf2", "2026-09-02T15:00:00.000Z"],
  ]) {
    const raw = readJsonIfExists(path.join(DATA_DIR, file));
    if (!raw) continue;
    packs.push({ packId, scrapedAt, skus: (raw.product_gaps ?? []).map((sku) => ({ raw: sku, bucket: null })) });
  }
  for (const [file, packId, scrapedAt] of [
    ["daily-2026-09-02-products.json", "d0902", "2026-09-02T18:00:00.000Z"],
    ["daily-2026-09-03-products.json", "d0903", "2026-09-03T05:21:59.000Z"],
  ]) {
    const raw = readJsonIfExists(path.join(DATA_DIR, file));
    if (!raw) continue;
    packs.push({ packId, scrapedAt, skus: (raw.products ?? []).map((sku) => ({ raw: sku, bucket: "daily" })) });
  }
  const cleared = readJsonIfExists(path.join(DATA_DIR, "daily-2026-09-10-cleared.json"));
  if (cleared) {
    const seals = loadDaySeals("2026-09-10");
    const allow = new Set([...(cleared.products_ok ?? []), ...(cleared.products_soft ?? []), ...seals.productWire]);
    const skus = (cleared.products ?? []).filter((sku) => {
      const slug = sku.supplier_slug_guess || slugify(sku.supplier_name);
      if (seals.productHolds.has(slug)) return false;
      if (allow.size && !allow.has(slug)) return false;
      return true;
    });
    packs.push({
      packId: "d0910",
      scrapedAt: "2026-09-10T18:10:50.000Z",
      skus: skus.map((sku) => ({ raw: sku, bucket: "daily" })),
    });
  }
  const hold35 = readJsonIfExists(path.join(DATA_DIR, "hold35-products-cleared.json"));
  if (hold35) {
    const seals = loadHold35ProductSeals();
    const allow = new Set([...(hold35.ok ?? []), ...(hold35.soft ?? []), ...seals.productWire]);
    const skus = (hold35.products ?? []).filter((sku) => {
      const slug = sku.supplier_slug_guess || slugify(sku.supplier_name);
      if (seals.productHolds.has(slug)) return false;
      if (allow.size && !allow.has(slug)) return false;
      return true;
    });
    packs.push({
      packId: "d0910-h35",
      scrapedAt: "2026-09-10T19:14:21.000Z",
      skus: skus.map((sku) => ({ raw: sku, bucket: "daily" })),
    });
  }
  const hold35r2 = readJsonIfExists(path.join(DATA_DIR, "hold35-refetch2-cleared.json"));
  if (hold35r2) {
    const seals = loadHold35Refetch2Seals();
    const allow = new Set([...(hold35r2.wire_ok ?? []), ...(hold35r2.soft ?? []).map(slugOf), ...seals.productWire]);
    const skus = (hold35r2.products ?? []).filter((sku) => {
      const slug = sku.supplier_slug_guess || slugify(sku.supplier_name);
      if (seals.productHolds.has(slug)) return false;
      if (allow.size && !allow.has(slug)) return false;
      return true;
    });
    if (skus.length) {
      packs.push({
        packId: "d0910-h35r2",
        scrapedAt: "2026-09-10T19:27:37.000Z",
        skus: skus.map((sku) => ({ raw: sku, bucket: "daily" })),
      });
    }
  }
  const day0911 = readJsonIfExists(path.join(DATA_DIR, "daily-2026-09-11-products-soft9.json"));
  if (day0911) {
    const seals = loadDaily0911Seals();
    const skus = (day0911.products ?? []).map(normalizeClearedSku).filter((sku) => {
      if (seals.productWire.size && !seals.productWire.has(sku.supplier_slug_guess)) return false;
      return true;
    });
    if (skus.length) {
      packs.push({
        packId: "d0911",
        scrapedAt: "2026-09-11T17:33:22.000Z",
        skus: skus.map((sku) => ({ raw: sku, bucket: "daily" })),
      });
    }
  }
  return packs;
}

function loadHold35Refetch2Seals() {
  const pack = readJsonIfExists(path.join(DATA_DIR, "hold35-refetch2-cleared.json"));
  const productHolds = new Set((pack?.hold_out ?? []).map(slugOf).filter(Boolean));
  const productWire = new Set(
    [...(pack?.wire_ok ?? []), ...(pack?.soft ?? []).map(slugOf)].filter(
      (slug) => slug && !productHolds.has(slug)
    )
  );
  return { productHolds, productWire };
}

function loadHold35ProductSeals() {
  const products = readJsonIfExists(path.join(ROOT, "docs", "researcher-hold35-products-2026-09-10.json"));
  const pack = readJsonIfExists(path.join(DATA_DIR, "hold35-products-cleared.json"));
  const productHolds = new Set(
    [
      ...(pack?.hold_out ?? []),
      ...(products?.hold_do_not_wire ?? []).map(slugOf),
    ].filter(Boolean)
  );
  const productWire = new Set(
    [
      ...(pack?.ok ?? []),
      ...(pack?.soft ?? []),
      ...(products?.sealed_wire_ok ?? []),
      ...(products?.soft ?? []).map(slugOf),
    ].filter((slug) => slug && !productHolds.has(slug))
  );
  return { productHolds, productWire };
}

/** Lead with branded SKU stills; mill-fallback extras trail. */
function preferBrandedProductStills(paths) {
  const branded = paths.filter((p) => !/mill-fallback/i.test(p));
  const fallbacks = paths.filter((p) => /mill-fallback/i.test(p));
  return branded.length ? [...branded, ...fallbacks] : paths;
}

/** Skips (HTML stubs) minus files later re-verified as official stills AND valid images. */
function loadSkipSet() {
  const skips = readJsonIfExists(path.join(DATA_DIR, "product-media-batch3-skips.json"));
  const attribution = readJsonIfExists(path.join(DATA_DIR, "product-media-batch3-hadeed-attribution.json"));
  const revalidated = new Set(
    (attribution?.hadeed_official_product_stills ?? []).map((f) => `/images/products/steel/hadeed/${f}`)
  );
  const out = new Set();
  for (const rel of skips?.skipped_not_images ?? []) {
    const pub = publicPathFromPackPath(rel);
    if (!pub) continue;
    if (revalidated.has(pub) && verifyPublicPath(pub)) continue;
    out.add(pub);
  }
  // Visual QA excludes: files the Lister pulled that are not product photos
  // (annual-report charts, plant maps, spec tables, staff portraits, lifestyle
  // ads, campus renders, award badges). Paths relative to /images/products/.
  for (const rel of config.productImageExcludes ?? []) out.add(`/images/products/${rel}`);
  return out;
}

function orderHadeed(images) {
  const official = new Set((config.hadeedOfficialStills ?? []).map((f) => `/images/products/steel/hadeed/${f}`));
  const plant = /midrex|plant/i;
  return [
    ...images.filter((u) => official.has(u)),
    ...images.filter((u) => !official.has(u) && !plant.test(u)),
    ...images.filter((u) => !official.has(u) && plant.test(u)),
  ];
}

function findBucketForSlug(slug) {
  for (const bucket of BUCKETS) {
    if (fs.existsSync(path.join(PUBLIC_DIR, "images", "products", bucket, slug))) return bucket;
  }
  return null;
}

function buildProducts(suppliersById, supplierIdBySlug, report) {
  const skipSet = loadSkipSet();
  const products = [];
  const seenIds = new Set();

  for (const pack of loadProductPacks()) {
    // Group SKUs per supplier folder so image assignment sees the whole folder.
    const groups = new Map();
    for (const { raw, bucket } of pack.skus) {
      const supplierSlug = raw.supplier_slug_guess || slugify(raw.supplier_name);
      const key = `${bucket ?? "?"}/${supplierSlug}`;
      const list = groups.get(key) ?? [];
      list.push({ raw, bucket, supplierSlug });
      groups.set(key, list);
    }

    for (const items of groups.values()) {
      const supplierSlug = items[0].supplierSlug;
      const supplierId = supplierIdBySlug.get(supplierSlug) ?? config.supplierIdBySlug?.[supplierSlug] ?? supplierSlug;
      const supplier = suppliersById.get(supplierId);
      if (!supplier) {
        report.productsUnresolvedSupplier.push(`${pack.packId}:${supplierSlug} (${items.length})`);
        continue;
      }
      let bucket = items[0].bucket;
      if (!bucket) bucket = findBucketForSlug(supplierSlug);
      const folder =
        bucket === "daily" || !bucket
          ? `images/products/${supplierSlug}`
          : `images/products/${bucket}/${supplierSlug}`;
      const folderFiles = preferEnhancedJpegPaths(listImageFiles(folder))
        .filter((p) => !skipSet.has(p))
        .filter((p) => verifyPublicPath(p) || (report.badImageFiles.push(p), false));

      const rows = items.map(({ raw }) => {
        const slug = raw.product_slug || slugify(raw.product_name);
        return { id: `pack-${supplierSlug}-${slug}`, slug, nameSlug: slugify(raw.product_name), raw };
      });
      const assigned = assignFolderImages(rows, folderFiles, supplierSlug, config.stemAliases, config.extraStems);

      for (const row of rows) {
        const { raw } = row;
        if (seenIds.has(row.id)) {
          report.duplicateProducts.push(row.id);
          continue;
        }
        seenIds.add(row.id);
        const category =
          toCategory(raw.category) ??
          (bucket && bucket !== "daily" ? CATEGORY_BY_BUCKET[bucket] : null) ??
          supplier.category;

        // Explicit local_images from the pack win; folder assignment only fills
        // in when the pack declared nothing. A SKU whose declared photos were
        // all QA-excluded must NOT inherit a sibling product's photos.
        const declared = (raw.local_images ?? []).map(publicPathFromPackPath).filter(Boolean);
        let images = uniq(declared.filter((p) => !skipSet.has(p)).map(verifyPublicPath));
        if (images.length === 0 && declared.length === 0) images = assigned.get(row.id) ?? [];
        images = preferBrandedProductStills(preferEnhancedJpegPaths(uniq(images)));
        if (supplierSlug === "hadeed") images = orderHadeed(images);
        if (images.length === 0) report.productsWithoutPhotos.push(row.id);

        const priceType = String(raw.price_source_type ?? "rfq").toLowerCase();
        const hasPrice = PRICED_SOURCE_TYPES.has(priceType) && typeof raw.unit_price === "number" && raw.unit_price > 0;
        const held = isHeld(supplierSlug, row.slug);
        if (held) report.heldProducts.push(row.id);
        const remoteImage = (raw.image_urls ?? []).find((u) => /^https?:\/\//i.test(u) && !/\.pdf(\b|$)/i.test(u)) ?? null;
        const priceNote = raw.price_note ? String(raw.price_note).trim() : "";
        const specifications = {
          Supplier: supplier.name,
          Category: category,
          "Price source": PRICE_SOURCE_LABELS[priceType] ?? PRICE_SOURCE_LABELS.rfq,
          ...(supplierSlug === "hadeed" && images.length
            ? { "Image credit": "Official Hadeed product stills (hadeed.com.sa)" }
            : {}),
          ...(SOFT_TUBE_PRODUCT_SLUGS.has(supplierSlug)
            ? { "Image credit": SOFT_TUBE_IMAGE_CREDIT }
            : {}),
          ...(SOFT_PRODUCT_IMAGE_CREDITS[supplierSlug]
            ? { "Image credit": SOFT_PRODUCT_IMAGE_CREDITS[supplierSlug] }
            : {}),
        };

        products.push({
          id: row.id,
          pack: pack.packId,
          packSlug: supplierSlug,
          supplierId,
          supplierName: supplier.name,
          supplierLogo: supplier.logoUrl ?? null,
          supplierCountry: supplier.country ?? null,
          name: raw.product_name,
          slug: row.slug,
          category,
          images,
          videos: [],
          basePrice: hasPrice ? raw.unit_price : null,
          priceUnit: hasPrice ? priceUnitOf(raw.unit) : null,
          priceSourceType: priceType,
          commissionRate: null,
          currency: raw.currency ?? "USD",
          moq: moqFromNote(priceNote, supplier.moq),
          minimumOrderUnit: null,
          shippingTime: null,
          description: priceNote ? `${raw.product_name} from ${supplier.name}. ${priceNote}` : `${raw.product_name} from ${supplier.name}.`,
          shortDescription: `${raw.product_name} — ${supplier.name}`,
          specifications,
          customizationOptions: [],
          certifications: [],
          rating: null,
          reviewCount: null,
          sourceUrl: raw.source_url ?? supplier.website ?? "",
          productUrl: raw.source_url ?? null,
          imageSourceUrl: remoteImage,
          sku: null,
          verifiedSupplier: Boolean(supplier.verified),
          status: held ? "needs_info" : "approved",
          scrapedAt: pack.scrapedAt,
        });
      }
    }
  }
  return products;
}

/* ------------------------------------------------------------------ */
/* Assemble                                                            */
/* ------------------------------------------------------------------ */

export function buildCatalog() {
  const report = {
    suppliersWithoutPhotos: [],
    suppliersMergedIntoExisting: [],
    duplicateSuppliers: [],
    certSlugsBlocked: [],
    certSlugsUnresolved: [],
    badImageFiles: [],
    productsUnresolvedSupplier: [],
    productsWithoutPhotos: [],
    duplicateProducts: [],
    heldProducts: [],
  };

  const outscraper = loadOutscraperSuppliers();
  const existingById = new Map(outscraper.map((s) => [s.id, s]));
  const existingByName = new Map();
  for (const s of outscraper) existingByName.set(normalizeName(s.name), s.id);

  const clearedMills = buildClearedDailySuppliers("2026-09-10", report);
  const hold30Mills = buildHold30Suppliers(report);
  const day0911Mills = buildDaily0911Suppliers(report);
  const wiredClearedSlugs = new Set([
    ...clearedMills.map((s) => s.packSlug),
    ...hold30Mills.map((s) => s.packSlug),
  ]);
  const wired0911Slugs = new Set([...wiredClearedSlugs, ...day0911Mills.map((s) => s.packSlug)]);
  const raw = [
    ...buildPhase1Suppliers(report),
    ...buildDailySuppliers("2026-09-02", report),
    ...buildDailySuppliers("2026-09-03", report),
    ...clearedMills,
    ...hold30Mills,
    ...day0911Mills,
    ...buildClearedProductHosts("2026-09-10", wiredClearedSlugs, report),
    ...buildDaily0911ProductHosts(wired0911Slugs, report),
  ];

  // Dedupe: by id, then by website domain / normalised name against the pack
  // itself and the existing Outscraper directory (the pack row overlays it).
  const suppliers = [];
  const byId = new Map();
  const seenDomain = new Map();
  const seenName = new Map();
  for (const s of raw) {
    const domain = domainOf(s.website);
    const nname = normalizeName(s.name);
    const dupOf = byId.get(s.id) ?? (domain && seenDomain.get(domain)) ?? seenName.get(nname);
    if (dupOf) {
      // Merge photos into the first occurrence, keep the first row's identity.
      dupOf.supplierImages = uniq([...(dupOf.supplierImages ?? []), ...(s.supplierImages ?? [])]);
      dupOf.imageUrl = dupOf.imageUrl ?? dupOf.supplierImages[0];
      report.duplicateSuppliers.push(`${s.pack}:${s.packSlug} -> ${dupOf.id}`);
      continue;
    }
    // Directory dedupe is by id / normalised name only — a shared website
    // domain can be a regional sales office, not the same legal entity.
    const existingId = (existingById.has(s.id) && s.id) || existingByName.get(nname) || null;
    if (existingId && existingId !== s.id) {
      report.suppliersMergedIntoExisting.push(`${s.id} -> ${existingId}`);
      s.id = existingId;
      if (byId.has(existingId)) {
        report.duplicateSuppliers.push(`${s.pack}:${s.packSlug} -> ${existingId}`);
        continue;
      }
    } else if (existingId) {
      report.suppliersMergedIntoExisting.push(`${s.id} (overlays directory row)`);
    }
    s.overlaysExisting = Boolean(existingId);
    byId.set(s.id, s);
    if (domain) seenDomain.set(domain, s);
    seenName.set(nname, s);
    suppliers.push(s);
  }

  const supplierIdBySlug = new Map(suppliers.map((s) => [s.packSlug, s.id]));
  const suppliersById = new Map(suppliers.map((s) => [s.id, s]));

  const certifications = buildCertifications(suppliersById, report);
  for (const cert of certifications) {
    const s = suppliersById.get(cert.supplierId);
    if (!s) continue;
    s.certificationImages = uniq([...(s.certificationImages ?? []), cert.imageUrl]);
    // Attach the scan to a matching text claim when possible, else add it.
    const key = normalizeName(cert.name);
    const match = (s.certificationsDetailed ?? []).find((c) => {
      const k = normalizeName(c.name);
      return !c.imageUrl && (k === key || k.startsWith(key) || key.startsWith(k));
    });
    if (match) {
      match.imageUrl = cert.imageUrl;
      match.type = match.type ?? cert.type;
      match.sourceUrl = match.sourceUrl ?? cert.sourceUrl;
    } else {
      s.certificationsDetailed = [
        ...(s.certificationsDetailed ?? []),
        { name: cert.name, type: cert.type, imageUrl: cert.imageUrl, sourceUrl: cert.sourceUrl },
      ];
    }
  }

  const products = buildProducts(suppliersById, supplierIdBySlug, report);

  const stats = {
    suppliers: suppliers.length,
    suppliersWithPhotos: suppliers.filter((s) => (s.supplierImages ?? []).length > 0).length,
    suppliersWithLogo: suppliers.filter((s) => s.logoUrl && s.logoUrl.startsWith("/images/")).length,
    supplierPhotos: suppliers.reduce((n, s) => n + (s.supplierImages ?? []).length, 0),
    suppliersOverlayingDirectory: suppliers.filter((s) => s.overlaysExisting).length,
    distributors: suppliers.filter((s) => s.businessType === "Distributor").map((s) => s.id),
    certifications: certifications.length,
    suppliersWithCertImages: new Set(certifications.map((c) => c.supplierId)).size,
    products: products.length,
    productsApproved: products.filter((p) => p.status === "approved").length,
    productsWithPhotos: products.filter((p) => p.images.length > 0).length,
    productPhotos: products.reduce((n, p) => n + p.images.length, 0),
    productsHeld: products.filter((p) => p.status === "needs_info").length,
  };

  return {
    catalog: {
      $schema: "suplymate/pack-catalog@1",
      generatedBy: "scripts/build-catalog-from-packs.mjs",
      stats,
      suppliers,
      certifications,
      products,
    },
    report,
  };
}

function stableStringify(catalog) {
  return JSON.stringify(catalog, null, 2) + "\n";
}

function main() {
  const check = process.argv.includes("--check");
  const { catalog, report } = buildCatalog();
  const json = stableStringify(catalog);

  console.log("pack catalogue:", JSON.stringify(catalog.stats, null, 2));
  for (const [key, list] of Object.entries(report)) {
    if (!list.length) continue;
    console.log(`\n${key} (${list.length}):`);
    for (const item of list.slice(0, 40)) console.log(`  - ${item}`);
    if (list.length > 40) console.log(`  … +${list.length - 40} more`);
  }

  if (check) {
    const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, "utf8") : "";
    if (current !== json) {
      console.error(`\n${path.relative(ROOT, OUT_FILE)} is stale — run: node scripts/build-catalog-from-packs.mjs`);
      process.exit(1);
    }
    console.log("\nOK — generated catalogue is up to date.");
    return;
  }
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, json);
  console.log(`\nWrote ${path.relative(ROOT, OUT_FILE)} (${(json.length / 1024).toFixed(0)} KB)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
