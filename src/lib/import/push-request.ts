// Request parser for the Grok-machine push hook (POST /api/admin/import/run).
//
// Two encodings, same fields:
//
//  multipart/form-data (whole day or one chunk of it)
//    day=2026-09-02  part=1  of=3            chunk protocol (see docs/daily-import.md)
//    seal=<seal.json>                        file or JSON string
//    suppliers.json=<file>  products.json=<file>
//    manifest=<*manifest*.json>              optional, repeatable ([{src,dst}])
//    options={"dryRun":true,"limit":50}      optional JSON string
//    enhanced/suppliers/posco/05.jpg=<file>  every other file part: field name =
//                                            path relative to the pack root
//
//  application/json (small pushes)
//    { day, part, of, seal, suppliers | products | pack | csv, manifest,
//      files: { "enhanced/x.jpg": "data:image/jpeg;base64,…" }, ...run options }
//
// Every chunk must carry suppliers.json + products.json + seal (they are small);
// image parts are split across chunks. Body size is capped
// (IMPORT_PUSH_MAX_BYTES, default 4 MB — Vercel rejects > 4.5 MB) → 413.

import { PackFiles } from "./pack-files";

export const DEFAULT_PUSH_MAX_BYTES = 4_000_000;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

export function pushMaxBytes(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.IMPORT_PUSH_MAX_BYTES);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_PUSH_MAX_BYTES;
}

export type PushPayload = {
  encoding: "multipart" | "json";
  day: string | null;
  part: number;
  of: number;
  /** Raw seal (object or JSON text) — verified by seal.ts. */
  seal: unknown | null;
  /** Raw JSON text of suppliers.json / products.json (hashable) when provided as text. */
  suppliersText: string | null;
  productsText: string | null;
  /** Parsed pack objects when the JSON body carried them as objects. */
  suppliersObj: unknown | null;
  productsObj: unknown | null;
  /** Legacy inline forms (JSON body). */
  pack: unknown | null;
  csv: string | null;
  manifests: unknown[];
  files: PackFiles;
  /** Remaining scalar fields (limit, dryRun, grok, …) for optionsFromBody. */
  options: Record<string, unknown>;
  /** Approximate bytes received. */
  bytes: number;
  warnings: string[];
};

export type PushParseResult = { ok: true; payload: PushPayload } | { ok: false; status: 400 | 413 | 415; error: string };

function intField(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

function dayField(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : null;
}

function tooLarge(bytes: number, max: number): PushParseResult {
  return {
    ok: false,
    status: 413,
    error: `Request body is ${bytes} bytes; the push hook accepts at most ${max} bytes per request. Split the day into more chunks (see docs/daily-import.md).`,
  };
}

const JSON_NAME = /^(suppliers|products|seal|seals|manifest)(\.json)?$/i;
const MANIFEST_NAME = /manifest/i;

function normalizeJsonName(field: string, filename: string | null): "suppliers" | "products" | "seal" | "manifest" | null {
  const f = field.trim().toLowerCase();
  const m = f.match(JSON_NAME);
  if (m) return m[1] === "seals" ? "seal" : (m[1] as "suppliers" | "products" | "seal" | "manifest");
  if (MANIFEST_NAME.test(f) || (filename && MANIFEST_NAME.test(filename))) return "manifest";
  if (filename) {
    const fm = filename.toLowerCase().match(JSON_NAME);
    if (fm) return fm[1] === "seals" ? "seal" : (fm[1] as "suppliers" | "products" | "seal" | "manifest");
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* data: URLs (JSON body)                                              */
/* ------------------------------------------------------------------ */

export function decodeDataUrl(v: string): { buffer: Buffer; contentType: string | null } | null {
  const m = v.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
  if (!m) return null;
  try {
    const buffer = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8");
    return { buffer, contentType: m[1] ?? null };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */

export async function parsePushRequest(request: Request, opts: { maxBytes?: number } = {}): Promise<PushParseResult> {
  const max = opts.maxBytes ?? pushMaxBytes();
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return tooLarge(declared, max);

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.startsWith("multipart/form-data")) return parseMultipart(request, max);
  if (!contentType || contentType.includes("json") || contentType.startsWith("text/")) return parseJson(request, max);
  return { ok: false, status: 415, error: `Unsupported content-type "${contentType}". Use multipart/form-data or application/json.` };
}

function emptyPayload(encoding: PushPayload["encoding"]): PushPayload {
  return {
    encoding,
    day: null,
    part: 1,
    of: 1,
    seal: null,
    suppliersText: null,
    productsText: null,
    suppliersObj: null,
    productsObj: null,
    pack: null,
    csv: null,
    manifests: [],
    files: new PackFiles(),
    options: {},
    bytes: 0,
    warnings: [],
  };
}

async function parseMultipart(request: Request, max: number): Promise<PushParseResult> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    return { ok: false, status: 400, error: `Could not parse multipart body: ${(err as Error).message}` };
  }
  const p = emptyPayload("multipart");
  const isFile = (v: FormDataEntryValue): v is File => typeof v !== "string";

  for (const [field, value] of form.entries()) {
    const filename = isFile(value) ? value.name || null : null;
    const size = isFile(value) ? value.size : value.length;
    p.bytes += size;
    if (p.bytes > max) return tooLarge(p.bytes, max);

    const jsonKind = normalizeJsonName(field, filename);
    if (jsonKind && (!isFile(value) || !IMAGE_EXT_RE.test(filename ?? ""))) {
      const text = isFile(value) ? Buffer.from(await value.arrayBuffer()).toString("utf8") : value;
      if (jsonKind === "suppliers") p.suppliersText = text;
      else if (jsonKind === "products") p.productsText = text;
      else if (jsonKind === "seal") p.seal = text;
      else {
        try {
          p.manifests.push(JSON.parse(text));
        } catch {
          p.warnings.push(`manifest "${field}" is not valid JSON — ignored`);
        }
      }
      continue;
    }

    if (isFile(value)) {
      // Field name = path relative to the pack root; fall back to the filename
      // for generic field names like "files" / "file".
      const path = /^(files?|images?|upload)(\[\])?$/i.test(field) ? (filename ?? field) : field;
      const buffer = Buffer.from(await value.arrayBuffer());
      const rel = p.files.add(path, buffer, { filename, contentType: value.type || null });
      if (!rel) p.warnings.push(`file "${field}" has an invalid path — ignored`);
      continue;
    }

    switch (field) {
      case "day":
        p.day = dayField(value);
        if (!p.day) return { ok: false, status: 400, error: `Invalid "day" (expected YYYY-MM-DD, got "${value}").` };
        break;
      case "part":
        p.part = intField(value, 1);
        break;
      case "of":
        p.of = intField(value, 1);
        break;
      case "options":
        try {
          const o = JSON.parse(value);
          if (o && typeof o === "object") Object.assign(p.options, o);
        } catch {
          return { ok: false, status: 400, error: `"options" must be a JSON object string.` };
        }
        break;
      case "csv":
        p.csv = value;
        break;
      case "pack":
        try {
          p.pack = JSON.parse(value);
        } catch {
          return { ok: false, status: 400, error: `"pack" must be JSON.` };
        }
        break;
      default:
        p.options[field] = value;
    }
  }
  if (p.part > p.of) return { ok: false, status: 400, error: `"part" (${p.part}) exceeds "of" (${p.of}).` };
  return { ok: true, payload: p };
}

async function parseJson(request: Request, max: number): Promise<PushParseResult> {
  const text = await request.text().catch(() => "");
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > max) return tooLarge(bytes, max);
  let body: Record<string, unknown> = {};
  if (text.trim()) {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, status: 400, error: "JSON body must be an object." };
      }
      body = parsed as Record<string, unknown>;
    } catch (err) {
      return { ok: false, status: 400, error: `Body is not valid JSON: ${(err as Error).message}` };
    }
  }

  const p = emptyPayload("json");
  p.bytes = bytes;
  const {
    day,
    part,
    of,
    seal,
    seals,
    suppliers,
    products,
    pack,
    csv,
    manifest,
    manifests,
    files,
    ...rest
  } = body;

  if (day != null) {
    p.day = dayField(day);
    if (!p.day) return { ok: false, status: 400, error: `Invalid "day" (expected YYYY-MM-DD).` };
  }
  p.part = intField(part, 1);
  p.of = intField(of, 1);
  if (p.part > p.of) return { ok: false, status: 400, error: `"part" (${p.part}) exceeds "of" (${p.of}).` };
  p.seal = seal ?? seals ?? null;

  if (typeof suppliers === "string") p.suppliersText = suppliers;
  else if (suppliers != null) p.suppliersObj = suppliers;
  if (typeof products === "string") p.productsText = products;
  else if (products != null) p.productsObj = products;
  if (pack != null) p.pack = pack;
  if (typeof csv === "string" && csv.trim()) p.csv = csv;
  for (const m of [manifest, ...(Array.isArray(manifests) ? manifests : [manifests])]) if (m != null) p.manifests.push(m);

  if (files && typeof files === "object" && !Array.isArray(files)) {
    for (const [path, v] of Object.entries(files as Record<string, unknown>)) {
      if (typeof v !== "string") continue;
      const decoded = decodeDataUrl(v);
      if (!decoded) {
        p.warnings.push(`files["${path}"] is not a data: URL — ignored`);
        continue;
      }
      const rel = p.files.add(path, decoded.buffer, { contentType: decoded.contentType });
      if (!rel) p.warnings.push(`files["${path}"] has an invalid path — ignored`);
    }
  }
  p.options = rest;
  return { ok: true, payload: p };
}

/** Does the payload carry any pack content at all? */
export function hasPackContent(p: PushPayload): boolean {
  return Boolean(p.suppliersText || p.productsText || p.suppliersObj || p.productsObj || p.pack || p.csv);
}
