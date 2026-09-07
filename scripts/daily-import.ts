// Run the daily supplier/product/media import locally (same job as the Vercel
// Cron at /api/cron/daily-import and the admin trigger /api/admin/import/run).
//
//   npx tsx scripts/daily-import.ts                              # env sources (IMPORT_BUNDLE_URL / OUTSCRAPER_API_KEY)
//   npx tsx scripts/daily-import.ts --file=data/daily-2026-09-02-suppliers.json --file=data/daily-2026-09-02-products.json
//   npx tsx scripts/daily-import.ts --url=https://…/suppliers.json --limit=10
//   npx tsx scripts/daily-import.ts --file=scripts/import/examples/metalworks-china.json --dry-run
//   flags: --dry-run  --no-enhance  --no-grok  --no-outscraper  --limit=N  --product-limit=N  --base-url=https://suplymate.com
//
// Push mode (run ON the Grok machine — uploads a sealed day to the site):
//   npx tsx scripts/daily-import.ts --push https://suplymate.com --secret $CRON_SECRET \
//       --day 2026-09-02 --dir /workspace/suppliers-phase1/daily/2026-09-02 [--dry-run] [--chunk-bytes 3500000]
//   Sends suppliers.json + products.json + seal + *manifest*.json + enhanced/** as
//   multipart chunks to POST /api/admin/import/run (see docs/daily-import.md).
//
// Reads .env.local / .env (if present) so DATABASE_URL, BLOB_READ_WRITE_TOKEN,
// XAI_API_KEY, IMAGE_ENHANCER_URL … work exactly like on Vercel. Without a DB
// the run still parses/curates and reports what it would do; writes fall back
// to the in-memory overlays used by the stores.

import { existsSync, readFileSync } from "node:fs";
import { join, basename, isAbsolute } from "node:path";

for (const file of [".env.local", ".env"]) {
  const p = join(process.cwd(), file);
  if (existsSync(p)) {
    try {
      process.loadEnvFile?.(p);
    } catch {
      // ignore malformed env files
    }
  }
}

// Accepts both `--name=value` and `--name value`.
function args(name: string): string[] {
  const out: string[] = [];
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith(`--${name}=`)) out.push(a.slice(name.length + 3));
    else if (a === `--${name}` && argv[i + 1] && !argv[i + 1].startsWith("--")) out.push(argv[++i]);
  }
  return out;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function pushMode(baseUrl: string) {
  const { pushDay } = await import("../src/lib/import/push-client");
  const secret = args("secret")[0] ?? process.env.CRON_SECRET ?? "";
  const dir = args("dir")[0];
  const day = args("day")[0] ?? dir?.match(/(\d{4}-\d{2}-\d{2})\/?$/)?.[1];
  if (!secret) {
    console.error("Push mode needs --secret <CRON_SECRET> (or CRON_SECRET in the environment).");
    process.exit(1);
  }
  if (!dir || !day) {
    console.error("Push mode needs --dir /path/to/daily/YYYY-MM-DD and --day YYYY-MM-DD.");
    process.exit(1);
  }
  const options: Record<string, unknown> = {};
  if (flag("dry-run")) options.dryRun = true;
  if (flag("no-grok")) options.grok = false;
  const limit = Number(args("limit")[0] ?? "");
  if (limit > 0) options.limit = limit;
  const productLimit = Number(args("product-limit")[0] ?? "");
  if (productLimit > 0) options.productLimit = productLimit;

  const result = await pushDay({
    dir,
    day,
    baseUrl,
    secret,
    chunkBytes: Number(args("chunk-bytes")[0] ?? "") || undefined,
    includeOriginals: flag("include-originals"),
    options,
    log: (line) => console.error(`[push] ${line}`),
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.parts.some((p) => !p.ok) || result.parts.length === 0) process.exitCode = 1;
}

async function main() {
  const push = args("push")[0];
  if (push) return pushMode(push);

  const { runDailyImport } = await import("../src/lib/import/daily-import");
  const { parseImportPayload, mergePacks } = await import("../src/lib/import/pack-formats");

  const files = args("file");
  const urls = args("url");
  const limit = Number(args("limit")[0] ?? "") || undefined;
  const productLimit = Number(args("product-limit")[0] ?? "") || undefined;
  const baseUrl = args("base-url")[0] ?? process.env.IMPORT_PUBLIC_BASE_URL ?? null;

  const packs = files.map((f) => {
    const abs = isAbsolute(f) ? f : join(process.cwd(), f);
    if (!existsSync(abs)) {
      console.error(`File not found: ${abs}`);
      process.exit(1);
    }
    return parseImportPayload(readFileSync(abs, "utf8"), { label: basename(f), baseUrl });
  });
  const inline = packs.length ? mergePacks(packs, files.map((f) => basename(f)).join(" + ")) : null;

  const summary = await runDailyImport({
    trigger: "cli",
    inline,
    bundleUrls: urls.length ? urls : undefined,
    useOutscraper: flag("no-outscraper") ? false : undefined,
    limit,
    productLimit,
    dryRun: flag("dry-run"),
    enhance: !flag("no-enhance"),
    grok: !flag("no-grok"),
    // CLI has no function timeout; give it a generous hour.
    deadlineMs: 60 * 60 * 1000,
    actor: "cli",
    publicBaseUrl: baseUrl,
  });

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
