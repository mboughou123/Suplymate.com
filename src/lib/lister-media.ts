/**
 * Shared Lister media matching: supplier_slug + product slug/name → local
 * files under public/images/products/{bucket}/{supplier}/…
 * No Node fs — callers pass path lists from JSON manifests.
 */

const STOP_TOKENS = new Set(["and", "for", "the", "of", "with", "from", "per"]);

export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[''`"]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tokens(slug: string): Set<string> {
  return new Set(
    slug.split("-").filter((t) => t.length > 1 && !STOP_TOKENS.has(t))
  );
}

function stemOfFilename(filename: string): string {
  return filename.replace(/\.(jpe?g|png|webp)$/i, "").replace(/-\d+$/, "");
}

function variantIndex(filename: string): number {
  const m = filename.match(/-(\d+)\.(jpe?g|png|webp)$/i);
  return m ? Number(m[1]) : 0;
}

export function publicPathFromRepo(repoPath: string): string {
  const trimmed = repoPath.replace(/^\/+/, "");
  if (trimmed.startsWith("public/")) return `/${trimmed.slice("public/".length)}`;
  if (trimmed.startsWith("images/products/")) return `/${trimmed}`;
  return `/${trimmed}`;
}

/** Map Image Enhancer dst …/enhanced/{bucket}/{supplier}/{file} → public URL. */
export function publicPathFromEnhancedDst(dst: string): string | null {
  const rel = dst.trim().replace(/^\/+/, "");
  if (/^(construction|industrial|packaging|tubes|steel|cables)\/[^/]+\/[^/]+$/i.test(rel)) {
    return `/images/products/${rel}`;
  }
  const m = dst.match(
    /\/(?:enhanced|images)\/(construction|industrial|packaging|tubes|steel|cables)\/([^/]+)\/([^/]+)$/i
  );
  if (!m) return null;
  return `/images/products/${m[1]}/${m[2]}/${m[3]}`;
}

function scoreStem(stem: string, slug: string, nameSlug: string): number {
  if (stem === slug || stem === nameSlug) return 1000;
  if (nameSlug.startsWith(stem) || stem.startsWith(nameSlug)) {
    return 500 + Math.min(stem.length, nameSlug.length);
  }
  const a = tokens(stem);
  const b = tokens(nameSlug);
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  if (shared === 0) return 0;
  const nameParts = nameSlug.split("-");
  const first = stem.split("-")[0] ?? "";
  const firstHits = nameParts.filter((t) => t === first).length;
  const substringBonus = nameSlug.includes(stem) ? 40 : 0;
  return (shared / Math.max(a.size, b.size)) * 100 + shared * 10 + firstHits * 15 + substringBonus;
}

function sortVariants(filenames: string[]): string[] {
  return [...filenames].sort((a, b) => variantIndex(a) - variantIndex(b));
}

/** Alias `foo` also matches enhancer renames `foo-png.jpg` / `foo-webp.jpg`. */
function resolveAliasStem(
  alias: string | undefined,
  byStem: Map<string, IndexedLocalFile[]>,
  claimed: Set<string>
): string | null {
  if (!alias) return null;
  for (const stem of [alias, `${alias}-png`, `${alias}-webp`, `${alias}-jpeg`]) {
    if (byStem.has(stem) && !claimed.has(stem)) return stem;
  }
  return null;
}

export type MediaAssignRow = {
  id: string;
  name: string;
  slug: string;
  bucket: string;
  supplierSlug: string;
};

export type IndexedLocalFile = {
  bucket: string;
  supplierSlug: string;
  filename: string;
  publicPath: string;
};

/** `{supplierSlug}/{productSlug}` → Lister filename stem (when slugify misses). */
export type StemAliasMap = Record<string, string>;

export function indexPublicImagePaths(paths: string[]): IndexedLocalFile[] {
  const out: IndexedLocalFile[] = [];
  for (const raw of paths) {
    const pub = raw.startsWith("/images/") ? raw : publicPathFromRepo(raw);
    const parts = pub.replace(/^\//, "").split("/");
    // images/products/{bucket}/{supplier}/{file}
    if (parts.length < 5) continue;
    out.push({
      bucket: parts[2],
      supplierSlug: parts[3],
      filename: parts[4],
      publicPath: pub.startsWith("/") ? pub : `/${pub}`,
    });
  }
  return out;
}

export function assignLocalProductImages(
  rows: MediaAssignRow[],
  files: IndexedLocalFile[],
  aliases: StemAliasMap = {}
): Map<string, string[]> {
  const assigned = new Map<string, string[]>();
  const groups = new Map<string, MediaAssignRow[]>();
  for (const row of rows) {
    const key = `${row.bucket}/${row.supplierSlug}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const filesByKey = new Map<string, IndexedLocalFile[]>();
  for (const f of files) {
    const key = `${f.bucket}/${f.supplierSlug}`;
    const list = filesByKey.get(key) ?? [];
    list.push(f);
    filesByKey.set(key, list);
  }

  for (const [key, group] of groups) {
    const groupFiles = filesByKey.get(key) ?? [];
    const byStem = new Map<string, IndexedLocalFile[]>();
    for (const f of groupFiles) {
      const stem = stemOfFilename(f.filename);
      const list = byStem.get(stem) ?? [];
      list.push(f);
      byStem.set(stem, list);
    }

    const claimed = new Set<string>();
    const pathsForStem = (stem: string): string[] => {
      const variants = sortVariants((byStem.get(stem) ?? []).map((f) => f.filename));
      return variants.map(
        (fname) => (byStem.get(stem) ?? []).find((f) => f.filename === fname)!.publicPath
      );
    };

    for (const row of group) {
      const alias =
        aliases[`${row.supplierSlug}/${row.slug}`] ??
        aliases[`${row.supplierSlug}/${slugifyProductName(row.name)}`];
      const aliasStem = resolveAliasStem(alias, byStem, claimed);
      if (aliasStem) {
        claimed.add(aliasStem);
        assigned.set(row.id, pathsForStem(aliasStem));
      }
    }

    const ranked = group
      .filter((row) => !assigned.has(row.id))
      .map((row) => {
        const nameSlug = slugifyProductName(row.name);
        let bestStem: string | null = null;
        let bestScore = -1;
        for (const stem of byStem.keys()) {
          if (claimed.has(stem)) continue;
          const sc = scoreStem(stem, row.slug, nameSlug);
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

    for (const [stem, filesForStem] of byStem) {
      if (claimed.has(stem)) continue;
      let bestId: string | null = null;
      let bestScore = -1;
      for (const row of group) {
        const sc = scoreStem(stem, row.slug, slugifyProductName(row.name));
        if (sc > bestScore) {
          bestScore = sc;
          bestId = row.id;
        }
      }
      if (bestId && bestScore > 20) {
        const extra = sortVariants(filesForStem.map((f) => f.filename)).map(
          (fname) => filesForStem.find((f) => f.filename === fname)!.publicPath
        );
        assigned.set(bestId, [...(assigned.get(bestId) ?? []), ...extra]);
      }
    }
  }

  return assigned;
}

export function isListerProductId(id: string): boolean {
  return /^lister-b\d+-/.test(id);
}

export function isUsableRemoteImageUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url.trim())) return false;
  if (/\.pdf(\b|$)/i.test(url)) return false;
  const path = url.split("?")[0];
  if (/\.(jpe?g|png|webp|gif|avif)$/i.test(path)) return true;
  if (/\/(photo|images|img|media|uploads|coreimg|getmedia)\//i.test(url)) return true;
  return false;
}

/** Drop leftover .webp/.png/.jpeg when an enhanced .jpg sibling exists. */
export function preferEnhancedJpegPaths(paths: string[]): string[] {
  const set = new Set(paths);
  return paths.filter((p) => {
    if (/\.jpeg$/i.test(p) && set.has(p.replace(/\.jpeg$/i, ".jpg"))) return false;
    const m = p.match(/^(.*)\.(webp|png)$/i);
    if (!m) return true;
    const stem = m[1];
    const ext = m[2].toLowerCase();
    return !set.has(`${stem}.jpg`) && !set.has(`${stem}-${ext}.jpg`);
  });
}
