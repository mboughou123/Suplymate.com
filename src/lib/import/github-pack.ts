// Sealed-pack source from a GitHub branch (secondary / cron path).
//
// The "Website" step of the Grok machine commits each finished day onto the
// PR #15 branch (cursor/amine-review-nav-mate-ctas-83a7), flat under data/:
//
//   data/daily-2026-09-03-suppliers.json
//   data/daily-2026-09-03-products.json
//   data/daily-2026-09-03-manifest-products.json      ← Image Enhancer [{src,dst}]
//   data/daily-2026-09-03-summary.md
//   public/images/{suppliers,products}/<slug>/<file>.jpg  ← the stills
//
// plus, once the bot writes them, a seal for the day: `data/daily-<day>-seal.json`,
// `data/daily-<day>/seal.json`, or any `*.json` under a `_…/` directory
// (`data/_seals/2026-09-03.json`, `data/daily-<day>/_qa/ok.json`, …).
//
// IMPORT_GITHUB_PACK="owner/repo@branch:data" turns this on (path defaults to
// `data`). One `git/trees?recursive=1` call lists the tree; JSON and images are
// fetched raw (GITHUB_TOKEN when set — needed for private repos and to stay
// clear of the 60 req/h anonymous limit). The newest day WITH a verified seal
// wins; unsealed days are skipped, never imported. Images referenced by
// `local_images` / `photo_urls` relative paths resolve to files in the same tree
// (day folder → data/ → public/images/…), fetched lazily per supplier / product
// through GithubPackFiles.prefetch().

import { mergePacks, parseImportPayload, type ImportPack } from "./pack-formats";
import { PackFiles, toPackRelative } from "./pack-files";
import { DAY_RE, isSealCandidatePath, parseSeal, verifySeal, type Seal } from "./seal-format";

export type GithubPackSpec = { owner: string; repo: string; ref: string; path: string };

const MAX_JSON_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_SEAL_FETCHES = 12;
const MAX_DAYS_SCANNED = 10;

/** `owner/repo@branch:path` → spec (path defaults to "data", branch to "main"). */
export function parseGithubPackSpec(v: string | undefined | null): GithubPackSpec | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(?:https?:\/\/github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:@([^:]+))?(?::(.*))?$/);
  if (!m) return null;
  const path = (m[4] ?? "data").trim().replace(/^\/+|\/+$/g, "") || "data";
  return { owner: m[1], repo: m[2], ref: (m[3] ?? "main").trim() || "main", path };
}

export function githubPackLabel(spec: GithubPackSpec): string {
  return `${spec.owner}/${spec.repo}@${spec.ref}:${spec.path}`;
}

type TreeEntry = { path: string; type: "blob" | "tree" | "commit"; sha: string; size?: number };

export class GithubClient {
  constructor(
    private spec: GithubPackSpec,
    private token: string | null,
    private fetchImpl: typeof fetch = fetch
  ) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { "User-Agent": "SuplymateImportBot/1.0", ...extra };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  async tree(): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
    const url = `https://api.github.com/repos/${this.spec.owner}/${this.spec.repo}/git/trees/${encodeURIComponent(this.spec.ref)}?recursive=1`;
    const res = await this.fetchImpl(url, {
      headers: this.headers({ Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`GitHub tree ${githubPackLabel(this.spec)} → HTTP ${res.status}${res.status === 401 || res.status === 403 ? " (set GITHUB_TOKEN)" : ""}`);
    const body = (await res.json()) as { tree?: TreeEntry[]; truncated?: boolean };
    return { entries: Array.isArray(body.tree) ? body.tree : [], truncated: Boolean(body.truncated) };
  }

  rawUrl(path: string): string {
    return `https://raw.githubusercontent.com/${this.spec.owner}/${this.spec.repo}/${this.spec.ref}/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  async raw(path: string, maxBytes: number): Promise<Buffer> {
    const res = await this.fetchImpl(this.rawUrl(path), { headers: this.headers(), signal: AbortSignal.timeout(45_000), redirect: "follow" });
    if (!res.ok) throw new Error(`GitHub raw ${path} → HTTP ${res.status}`);
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > maxBytes) throw new Error(`${path} exceeds ${maxBytes} bytes`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new Error(`${path} exceeds ${maxBytes} bytes`);
    return buf;
  }
}

/* ------------------------------------------------------------------ */
/* Tree helpers                                                        */
/* ------------------------------------------------------------------ */

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

export function daysInTree(paths: Iterable<string>, root: string): string[] {
  const days = new Set<string>();
  const re = new RegExp(`^${escapeRe(root)}/daily-(\\d{4}-\\d{2}-\\d{2})(?:[-/]|\\.json$)`);
  for (const p of paths) {
    const m = p.match(re);
    if (m && DAY_RE.test(m[1]) && /(suppliers|products)/i.test(p)) days.add(m[1]);
  }
  return [...days].sort().reverse();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Candidate seal files for `day`, most specific first. */
export function sealPathsFor(paths: string[], root: string, day: string): string[] {
  const inRoot = paths.filter((p) => p.startsWith(`${root}/`) && /\.json$/i.test(p));
  const dayDir = `${root}/daily-${day}/`;
  const specific = inRoot.filter((p) => p.includes(day) && (isSealCandidatePath(p.slice(root.length + 1)) || p.startsWith(dayDir)));
  const underscore = inRoot.filter((p) => !p.includes(day) && /(^|\/)_[^/]*\//.test(p.slice(root.length)) && !/manifest|suppliers|products/i.test(p));
  const named = inRoot.filter((p) => !specific.includes(p) && !underscore.includes(p) && /(^|\/)seals?[^/]*\.json$/i.test(p) && !p.includes("daily-"));
  return [...new Set([...specific.sort(), ...underscore.sort(), ...named.sort()])];
}

/* ------------------------------------------------------------------ */
/* Lazy image files                                                    */
/* ------------------------------------------------------------------ */

/**
 * PackFiles whose bytes live in the GitHub tree. `prefetch(refs)` downloads the
 * files for the next supplier / product (and drops the previous batch so a
 * 300-day-old mill gallery never sits in memory all at once).
 */
export class GithubPackFiles extends PackFiles {
  private fetched = new Set<string>();
  readonly missing: string[] = [];
  readonly failures: string[] = [];

  constructor(
    private client: GithubClient,
    private treePaths: Set<string>,
    private root: string,
    private day: string
  ) {
    super();
  }

  /** Tree paths that could hold pack-relative `rel`, best first. */
  candidates(rel: string): { path: string; storeAs: string; enhanced: boolean }[] {
    const out: { path: string; storeAs: string; enhanced: boolean }[] = [];
    const push = (path: string, storeAs: string, enhanced: boolean) => {
      if (this.treePaths.has(path) && !out.some((c) => c.path === path)) out.push({ path, storeAs, enhanced });
    };
    const dayDir = `${this.root}/daily-${this.day}`;
    const rest = rel.replace(/^(images|enhanced)\//, "");
    const enhancedRel = `enhanced/${rest}`;
    const dst = this.manifestFor(rel);
    for (const base of [dayDir, this.root]) {
      if (dst) push(`${base}/${dst}`, dst, true);
      push(`${base}/${enhancedRel}`, enhancedRel, true);
      push(`${base}/${rel}`, rel, rel.startsWith("enhanced/"));
      push(`${base}/images/${rest}`, `images/${rest}`, false);
    }
    // The Website step publishes the Enhancer's output under public/images/…;
    // it counts as enhanced only when the manifest names that file as a `dst`.
    const pub = `public/images/${rest}`;
    push(pub, this.isManifestDst(enhancedRel) || this.isManifestDst(rel) ? enhancedRel : `images/${rest}`, this.isManifestDst(enhancedRel) || this.isManifestDst(rel));
    push(`public/${rel}`, rel, rel.startsWith("enhanced/"));
    push(rel, rel, rel.startsWith("enhanced/"));
    return out;
  }

  async prefetch(refs: string[]): Promise<void> {
    // Release the previous batch.
    for (const k of this.fetched) this.remove(k);
    this.fetched.clear();
    for (const ref of refs) {
      const rel = toPackRelative(ref);
      if (!rel || !IMAGE_RE.test(rel) || this.resolve(ref)) continue;
      const cands = this.candidates(rel);
      if (!cands.length) {
        if (this.missing.length < 200) this.missing.push(rel);
        continue;
      }
      for (const c of cands) {
        try {
          const buf = await this.client.raw(c.path, MAX_IMAGE_BYTES);
          const key = this.add(c.storeAs, buf, { filename: c.path.split("/").pop() ?? null, contentType: null });
          if (key) this.fetched.add(key);
          break;
        } catch (err) {
          if (this.failures.length < 50) this.failures.push(`${c.path}: ${(err as Error).message}`);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Load                                                                */
/* ------------------------------------------------------------------ */

export type GithubDayReport = { day: string; sealed: boolean; reason: string | null; sealPath: string | null };

export type GithubPackResult =
  | {
      ok: true;
      day: string;
      seal: Seal;
      sealPath: string;
      pack: ImportPack;
      files: GithubPackFiles;
      source: string;
      days: GithubDayReport[];
      warnings: string[];
    }
  | { ok: false; skipped: "no_pack" | "unsealed"; reason: string; days: GithubDayReport[]; warnings: string[] };

export async function loadGithubPack(
  spec: GithubPackSpec,
  opts: { token?: string | null; fetchImpl?: typeof fetch; day?: string | null; baseUrl?: string | null } = {}
): Promise<GithubPackResult> {
  const client = new GithubClient(spec, opts.token?.trim() || null, opts.fetchImpl ?? fetch);
  const warnings: string[] = [];
  const label = githubPackLabel(spec);

  const { entries, truncated } = await client.tree();
  if (truncated) warnings.push(`GitHub tree for ${label} was truncated — some files may not be visible.`);
  const paths = new Set(entries.filter((e) => e.type === "blob").map((e) => e.path));
  const list = [...paths];

  const days = (opts.day ? [opts.day] : daysInTree(list, spec.path)).slice(0, MAX_DAYS_SCANNED);
  const report: GithubDayReport[] = [];
  if (!days.length) {
    return { ok: false, skipped: "no_pack", reason: `no daily-YYYY-MM-DD pack under ${label}`, days: report, warnings };
  }

  for (const day of days) {
    const suppliersPath = [`${spec.path}/daily-${day}-suppliers.json`, `${spec.path}/daily-${day}/suppliers.json`].find((p) => paths.has(p)) ?? null;
    const productsPath = [`${spec.path}/daily-${day}-products.json`, `${spec.path}/daily-${day}/products.json`].find((p) => paths.has(p)) ?? null;
    if (!suppliersPath && !productsPath) {
      report.push({ day, sealed: false, reason: "no suppliers.json / products.json", sealPath: null });
      continue;
    }

    // Seal: first candidate that parses as a seal for this day.
    let sealRaw: string | null = null;
    let sealPath: string | null = null;
    let fetched = 0;
    for (const p of sealPathsFor(list, spec.path, day)) {
      if (fetched >= MAX_SEAL_FETCHES) break;
      fetched++;
      try {
        const text = (await client.raw(p, 1024 * 1024)).toString("utf8");
        const parsed = parseSeal(text);
        if (parsed && parsed.day === day) {
          sealRaw = text;
          sealPath = p;
          break;
        }
      } catch (err) {
        warnings.push(`seal candidate ${p}: ${(err as Error).message}`);
      }
    }
    if (!sealRaw || !sealPath) {
      report.push({ day, sealed: false, reason: "no seal found (seal.json / _*/ *.json)", sealPath: null });
      continue;
    }

    const suppliersText = suppliersPath ? (await client.raw(suppliersPath, MAX_JSON_BYTES)).toString("utf8") : null;
    const productsText = productsPath ? (await client.raw(productsPath, MAX_JSON_BYTES)).toString("utf8") : null;
    const check = verifySeal(sealRaw, {
      day,
      files: { "suppliers.json": suppliersText ?? undefined, "products.json": productsText ?? undefined },
    });
    if (!check.ok) {
      report.push({ day, sealed: false, reason: check.reason, sealPath });
      continue;
    }

    const packs: ImportPack[] = [];
    if (suppliersText) packs.push(parseImportPayload(suppliersText, { label: "suppliers.json", localFiles: true, baseUrl: opts.baseUrl }));
    if (productsText) packs.push(parseImportPayload(productsText, { label: "products.json", localFiles: true, baseUrl: opts.baseUrl }));
    const source = `github:${label}/daily-${day}`;
    const pack = packs.length === 1 ? { ...packs[0], label: source } : mergePacks(packs, source);

    const files = new GithubPackFiles(client, paths, spec.path, day);
    const manifestPaths = list.filter((p) => p.startsWith(`${spec.path}/`) && p.includes(day) && /manifest.*\.json$/i.test(p)).sort();
    for (const mp of manifestPaths) {
      try {
        files.addManifest(JSON.parse((await client.raw(mp, MAX_JSON_BYTES)).toString("utf8")));
      } catch (err) {
        warnings.push(`manifest ${mp}: ${(err as Error).message}`);
      }
    }

    report.push({ day, sealed: true, reason: null, sealPath });
    return { ok: true, day, seal: check.seal, sealPath, pack, files, source, days: report, warnings };
  }

  const newest = report[0];
  return {
    ok: false,
    skipped: "unsealed",
    reason: `no sealed day under ${label} (newest ${newest?.day ?? "?"}: ${newest?.reason ?? "unsealed"})`,
    days: report,
    warnings,
  };
}
