// Client side of the push hook — what the Grok machine runs:
//
//   npx tsx scripts/daily-import.ts --push https://suplymate.com --secret $CRON_SECRET \
//       --day 2026-09-02 --dir /workspace/suppliers-phase1/daily/2026-09-02
//
// Reads the day folder, finds suppliers.json / products.json / seal / manifests
// / enhanced/** stills, splits the stills into chunks that fit the server's
// per-request cap, and POSTs each chunk as multipart/form-data (see
// push-request.ts for the field contract). Every chunk repeats the small JSON
// files + seal so the server can verify and process it independently; the
// server dedupes suppliers/products/media across chunks.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { isSealCandidatePath, parseSeal } from "./seal-format";

export const DEFAULT_CHUNK_BYTES = 3_500_000;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
/** Multipart framing overhead per part (boundary + headers), generous. */
const PART_OVERHEAD = 512;

export type DayFolder = {
  dir: string;
  day: string;
  suppliers: Buffer | null;
  products: Buffer | null;
  seal: Buffer | null;
  sealPath: string | null;
  manifests: { name: string; data: Buffer }[];
  files: { rel: string; abs: string; size: number }[];
  warnings: string[];
};

function walk(root: string, base: string, out: { rel: string; abs: string; size: number }[]) {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const abs = join(root, entry.name);
    if (entry.isDirectory()) walk(abs, base, out);
    else if (entry.isFile() && IMAGE_EXT_RE.test(entry.name)) {
      out.push({ rel: relative(base, abs).split(sep).join("/"), abs, size: statSync(abs).size });
    }
  }
}

function firstExisting(dir: string, names: string[]): string | null {
  for (const n of names) {
    const p = join(dir, n);
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

/** JSON files (pack-relative) in `dir`, at most `depth` levels deep. */
function jsonFilesIn(root: string, base: string, depth: number, out: string[]) {
  if (depth < 0 || !existsSync(root) || !statSync(root).isDirectory()) return;
  for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const abs = join(root, entry.name);
    if (entry.isDirectory()) jsonFilesIn(abs, base, depth - 1, out);
    else if (entry.isFile() && /\.json$/i.test(entry.name)) out.push(relative(base, abs).split(sep).join("/"));
  }
}

/**
 * Every file in the day folder that could be a seal, in preference order:
 * `seal.json` / `seals.json` / `seal-<day>.json` at the root, then everything
 * under `seals/` and under any `_…/` directory (`_seals/`, `_qa/`,
 * `_research/`, …) — the bot keeps its QA artefacts in `_`-prefixed dirs.
 */
export function sealCandidates(dir: string, day: string): string[] {
  const out: string[] = [];
  const push = (rel: string) => {
    if (!out.includes(rel) && existsSync(join(dir, rel)) && statSync(join(dir, rel)).isFile()) out.push(rel);
  };
  for (const n of ["seal.json", "seals.json", "seal", "seals", `seal-${day}.json`, `${day}.seal.json`, `${day}.json`]) push(n);
  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && (e.name === "seals" || e.name.startsWith("_")))
    .map((e) => e.name)
    .sort((a, b) => (a === "seals" ? -1 : b === "seals" ? 1 : a.localeCompare(b)));
  for (const d of dirs) {
    const found: string[] = [];
    jsonFilesIn(join(dir, d), dir, 3, found);
    for (const rel of found) push(rel);
  }
  return out;
}

/**
 * Locate the seal for `day`: the first candidate (see sealCandidates) that
 * parses as a seal for that day, else the first that parses at all, else a
 * root `seal.json`/`seals.json` if present (so the server can report why it is
 * malformed). Returns an absolute path or null.
 */
export function findSeal(dir: string, day: string): string | null {
  const candidates = sealCandidates(dir, day);
  let fallback: string | null = null;
  for (const rel of candidates) {
    const abs = join(dir, rel);
    let parsed: ReturnType<typeof parseSeal> = null;
    try {
      parsed = parseSeal(readFileSync(abs, "utf8"));
    } catch {
      parsed = null;
    }
    if (parsed?.day === day) return abs;
    if (parsed && !fallback) fallback = abs;
  }
  if (fallback) return fallback;
  const direct = firstExisting(dir, ["seal.json", "seals.json"]);
  if (direct) return direct;
  // A file literally named seal*.json that does not parse: still hand it over
  // so the server's 422 names the problem.
  const named = candidates.find((rel) => isSealCandidatePath(rel) && /seal/i.test(rel.split("/").pop() ?? ""));
  return named ? join(dir, named) : null;
}

export function readDayFolder(dir: string, day: string, opts: { includeOriginals?: boolean } = {}): DayFolder {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`Pack folder not found: ${dir}`);
  const warnings: string[] = [];
  const read = (name: string) => {
    const p = firstExisting(dir, [name]);
    return p ? readFileSync(p) : null;
  };
  const suppliers = read("suppliers.json");
  const products = read("products.json");
  if (!suppliers && !products) throw new Error(`Neither suppliers.json nor products.json found in ${dir}`);
  if (!suppliers) warnings.push("suppliers.json missing — products will attach to existing suppliers by name.");
  if (!products) warnings.push("products.json missing — suppliers only.");

  const sealPath = findSeal(dir, day);
  const seal = sealPath ? readFileSync(sealPath) : null;
  if (!seal) warnings.push("No seal found (seal.json / seals/ / _*/ *.json) — the server will refuse the import unless IMPORT_REQUIRE_SEAL=false.");

  const manifests = readdirSync(dir)
    .filter((f) => /manifest.*\.json$/i.test(f))
    .sort()
    .map((name) => ({ name, data: readFileSync(join(dir, name)) }));

  const files: DayFolder["files"] = [];
  walk(join(dir, "enhanced"), dir, files);
  if (!files.length) warnings.push("No enhanced/ stills found.");
  if (opts.includeOriginals) walk(join(dir, "images"), dir, files);
  files.sort((a, b) => a.rel.localeCompare(b.rel));

  return { dir, day, suppliers, products, seal, sealPath, manifests, files, warnings };
}

export type Chunk = { part: number; files: DayFolder["files"]; bytes: number };

/** Greedy split of the stills so every request stays under `maxBytes`. */
export function planChunks(folder: DayFolder, maxBytes = DEFAULT_CHUNK_BYTES): { chunks: Chunk[]; skipped: DayFolder["files"]; baseBytes: number } {
  const baseBytes =
    (folder.suppliers?.byteLength ?? 0) +
    (folder.products?.byteLength ?? 0) +
    (folder.seal?.byteLength ?? 0) +
    folder.manifests.reduce((n, m) => n + m.data.byteLength, 0) +
    PART_OVERHEAD * (6 + folder.manifests.length);
  const room = maxBytes - baseBytes;
  if (room <= 0) throw new Error(`JSON files alone (${baseBytes} bytes) exceed the chunk size ${maxBytes}.`);

  const chunks: Chunk[] = [];
  const skipped: DayFolder["files"] = [];
  let cur: Chunk = { part: 1, files: [], bytes: 0 };
  for (const f of folder.files) {
    const cost = f.size + PART_OVERHEAD;
    if (cost > room) {
      skipped.push(f);
      continue;
    }
    if (cur.bytes + cost > room && cur.files.length) {
      chunks.push(cur);
      cur = { part: chunks.length + 1, files: [], bytes: 0 };
    }
    cur.files.push(f);
    cur.bytes += cost;
  }
  if (cur.files.length || chunks.length === 0) chunks.push(cur);
  return { chunks, skipped, baseBytes };
}

export function buildChunkForm(folder: DayFolder, chunk: Chunk, of: number, options: Record<string, unknown> = {}): FormData {
  const form = new FormData();
  form.set("day", folder.day);
  form.set("part", String(chunk.part));
  form.set("of", String(of));
  if (folder.seal) {
    const sealName = folder.sealPath ? relative(folder.dir, folder.sealPath).split(sep).join("/") : "seal.json";
    form.set("seal", new Blob([new Uint8Array(folder.seal)], { type: "application/json" }), sealName);
  }
  if (folder.suppliers) form.set("suppliers.json", new Blob([new Uint8Array(folder.suppliers)], { type: "application/json" }), "suppliers.json");
  if (folder.products) form.set("products.json", new Blob([new Uint8Array(folder.products)], { type: "application/json" }), "products.json");
  for (const m of folder.manifests) form.append("manifest", new Blob([new Uint8Array(m.data)], { type: "application/json" }), m.name);
  if (Object.keys(options).length) form.set("options", JSON.stringify(options));
  for (const f of chunk.files) {
    const type = /\.png$/i.test(f.rel) ? "image/png" : /\.webp$/i.test(f.rel) ? "image/webp" : /\.gif$/i.test(f.rel) ? "image/gif" : /\.avif$/i.test(f.rel) ? "image/avif" : "image/jpeg";
    form.append(f.rel, new Blob([new Uint8Array(readFileSync(f.abs))], { type }), f.rel.split("/").pop() ?? "image");
  }
  return form;
}

export type PushResult = {
  day: string;
  endpoint: string;
  parts: { part: number; of: number; status: number; ok: boolean; body: unknown }[];
  skippedFiles: string[];
  warnings: string[];
  stoppedEarly: boolean;
};

export async function pushDay(opts: {
  dir: string;
  day: string;
  baseUrl: string;
  secret: string;
  chunkBytes?: number;
  options?: Record<string, unknown>;
  includeOriginals?: boolean;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}): Promise<PushResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const log = opts.log ?? (() => undefined);
  const folder = readDayFolder(opts.dir, opts.day, { includeOriginals: opts.includeOriginals });
  const { chunks, skipped, baseBytes } = planChunks(folder, opts.chunkBytes ?? DEFAULT_CHUNK_BYTES);
  const endpoint = `${opts.baseUrl.replace(/\/+$/, "")}/api/admin/import/run`;
  const warnings = [...folder.warnings, ...skipped.map((f) => `skipped ${f.rel}: ${f.size} bytes does not fit in one request`)];

  log(`pack ${folder.day}: ${folder.files.length} stills, ${folder.manifests.length} manifest(s), seal ${folder.sealPath ? "found" : "MISSING"}; ${chunks.length} request(s), JSON base ${baseBytes} bytes`);
  const result: PushResult = { day: folder.day, endpoint, parts: [], skippedFiles: skipped.map((f) => f.rel), warnings, stoppedEarly: false };

  for (const chunk of chunks) {
    const form = buildChunkForm(folder, chunk, chunks.length, opts.options ?? {});
    log(`POST ${endpoint} part ${chunk.part}/${chunks.length} (${chunk.files.length} files, ~${chunk.bytes + baseBytes} bytes)`);
    let status = 0;
    let body: unknown = null;
    try {
      const res = await fetchImpl(endpoint, { method: "POST", headers: { authorization: `Bearer ${opts.secret}` }, body: form });
      status = res.status;
      const text = await res.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text.slice(0, 2000) };
      }
    } catch (err) {
      body = { error: (err as Error).message };
    }
    const ok = status >= 200 && status < 300;
    result.parts.push({ part: chunk.part, of: chunks.length, status, ok, body });
    const b = (body ?? {}) as Record<string, unknown>;
    log(`  → ${status} ${ok ? "ok" : "FAILED"}${b.skipped ? ` (skipped: ${String(b.skipped)})` : ""}${b.error ? ` ${String(b.error)}` : ""}`);
    // Unsealed / rejected / too large: the remaining chunks would fail the same way.
    if (!ok && status !== 500) {
      result.stoppedEarly = true;
      break;
    }
  }
  return result;
}
