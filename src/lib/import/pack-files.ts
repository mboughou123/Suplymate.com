// Uploaded pack files — the bridge between a Grok-machine pack and the media
// pipeline when the images are NOT reachable by URL.
//
// A daily pack on the Grok machine lives under
//   /workspace/suppliers-phase1/daily/YYYY-MM-DD/
//     suppliers.json  products.json  seal.json
//     images/{suppliers,products}/<slug>/<file>.jpg     ← originals
//     enhanced/{suppliers,products}/<slug>/<file>.jpg   ← Image Enhancer output
//     *manifest*.json                                    ← [{ src, dst }] pairs
//
// `local_images` inside the JSON are absolute VM paths. The bot pushes the
// `enhanced/**` files as multipart parts whose field name is the path relative
// to the pack root. We turn every local path into a `packfile:<relative>`
// reference so it flows through the normal pack → curation → ingest chain, and
// the ingest step resolves the reference to the uploaded bytes (preferring the
// enhanced still over the original, via the manifest when one is provided).

export const PACKFILE_SCHEME = "packfile:";

const DAY_ROOT_RE = /[\\/]daily[\\/]\d{4}-\d{2}-\d{2}[\\/](.+)$/i;
const KNOWN_DIR_RE = /(?:^|[\\/])((?:images|enhanced|seals|certs|certifications)[\\/].+)$/i;

/**
 * Normalise a pack image path (absolute VM path, `./enhanced/x.jpg`, Windows
 * path, …) to a pack-relative POSIX path. Returns null for anything that
 * escapes the pack root or is not a file path.
 */
export function toPackRelative(input: string): string | null {
  let p = input.trim().replace(/\\/g, "/");
  if (!p || /^[a-z][a-z0-9+.-]*:\/\//i.test(p) || /^data:/i.test(p)) return null;
  if (p.startsWith(PACKFILE_SCHEME)) p = p.slice(PACKFILE_SCHEME.length);
  const day = p.match(DAY_ROOT_RE);
  if (day) p = day[1];
  else {
    const known = p.match(KNOWN_DIR_RE);
    if (known) p = known[1];
  }
  p = p.replace(/^(\.\/)+/, "").replace(/^\/+/, "");
  if (!p || p.split("/").some((seg) => seg === "..") || p.includes("\0")) return null;
  return p;
}

export function isPackFileRef(ref: string): boolean {
  return ref.startsWith(PACKFILE_SCHEME);
}

export function packFileRef(relative: string): string {
  return `${PACKFILE_SCHEME}${relative}`;
}

export function packFileRelative(ref: string): string | null {
  return isPackFileRef(ref) ? toPackRelative(ref.slice(PACKFILE_SCHEME.length)) : null;
}

/** http(s) URL or a packfile: reference — anything the ingest step can consume. */
export function isIngestableRef(ref: string | null | undefined): ref is string {
  return typeof ref === "string" && (/^https?:\/\//i.test(ref) || isPackFileRef(ref));
}

export type UploadedFile = {
  /** Pack-relative path (multipart field name). */
  path: string;
  buffer: Buffer;
  filename: string;
  contentType: string | null;
};

export type ResolvedPackFile = {
  file: UploadedFile;
  /** The reference that was asked for (normalised). */
  requested: string;
  /** True when the bytes come from an `enhanced/` still (Image Enhancer output). */
  preEnhanced: boolean;
};

/**
 * Candidate uploaded paths for a pack-relative reference, best first:
 *   1. the manifest `dst` for that `src` (exact Image Enhancer output)
 *   2. `enhanced/<rest>` when the ref is `images/<rest>`
 *   3. the ref itself
 *   4. `images/<rest>` when the ref is `enhanced/<rest>` (fall back to original)
 */
export function candidatePaths(relative: string, manifest?: Map<string, string>): string[] {
  const out: string[] = [];
  const push = (v: string | undefined | null) => {
    if (v && !out.includes(v)) out.push(v);
  };
  push(manifest?.get(relative));
  if (relative.startsWith("images/")) push(`enhanced/${relative.slice("images/".length)}`);
  push(relative);
  if (relative.startsWith("enhanced/")) push(`images/${relative.slice("enhanced/".length)}`);
  return out;
}

export class PackFiles {
  private files = new Map<string, UploadedFile>();
  private manifest = new Map<string, string>();

  get size(): number {
    return this.files.size;
  }

  get totalBytes(): number {
    let n = 0;
    for (const f of this.files.values()) n += f.buffer.byteLength;
    return n;
  }

  paths(): string[] {
    return [...this.files.keys()];
  }

  add(path: string, buffer: Buffer, meta: { filename?: string | null; contentType?: string | null } = {}): string | null {
    const rel = toPackRelative(path);
    if (!rel) return null;
    this.files.set(rel, {
      path: rel,
      buffer,
      filename: (meta.filename?.trim() || rel.split("/").pop() || "image").slice(0, 200),
      contentType: meta.contentType?.trim() || null,
    });
    return rel;
  }

  /** Register `[{ src, dst }]` pairs from an Image Enhancer manifest. */
  addManifest(raw: unknown): number {
    const entries = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { entries?: unknown }).entries) ? (raw as { entries: unknown[] }).entries : [];
    let n = 0;
    for (const e of entries) {
      if (!e || typeof e !== "object") continue;
      const o = e as Record<string, unknown>;
      const src = typeof o.src === "string" ? toPackRelative(o.src) : null;
      const dstRaw = typeof o.dst === "string" ? o.dst : typeof o.dst_rel === "string" ? o.dst_rel : null;
      const dst = dstRaw ? toPackRelative(dstRaw) : null;
      if (!src || !dst) continue;
      this.manifest.set(src, dst);
      n++;
    }
    return n;
  }

  has(ref: string): boolean {
    return this.resolve(ref) !== null;
  }

  /** Resolve a `packfile:` ref (or raw local path) to uploaded bytes. */
  resolve(ref: string): ResolvedPackFile | null {
    const rel = isPackFileRef(ref) ? packFileRelative(ref) : toPackRelative(ref);
    if (!rel) return null;
    for (const cand of candidatePaths(rel, this.manifest)) {
      const file = this.files.get(cand);
      if (file) return { file, requested: rel, preEnhanced: cand.startsWith("enhanced/") };
    }
    return null;
  }
}
