// Grok media bot — runs ON the bot machine (or in its Docker / Kubernetes
// worker), never on Vercel. See docs/grok-media-bot.md.
//
//   npx tsx scripts/media-bot.ts needs   --industry metals --out needs/metals.json
//   npx tsx scripts/media-bot.ts prepare --dir /data/media/inbox/2026-10-04-metals [--needs needs/metals.json] [--no-ai]
//   npx tsx scripts/media-bot.ts push    --dir /data/media/inbox/2026-10-04-metals [--dry-run] [--force]
//   npx tsx scripts/media-bot.ts run     --root /data/media/inbox --needs-dir /data/media/needs [--industries metals,packaging] [--every 60]
//   npx tsx scripts/media-bot.ts status
//
// Env: SUPLYMATE_URL (default https://suplymate.com), CRON_SECRET,
//      LOCAL_AI_BASE_URL (default http://localhost:11434/v1), LOCAL_AI_VISION_MODEL,
//      AI_CACHE_DATABASE_URL (separate Postgres; JSON file when unset), MEDIA_BOT_CACHE_FILE,
//      MEDIA_BOT_INBOX, MEDIA_BOT_NEEDS_DIR, MEDIA_BOT_INDUSTRIES, MEDIA_BOT_AI=off.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { MEDIA_INDUSTRY_IDS } from "../src/lib/media-bot/industry";
import { MEDIA_MANIFEST_FILENAME, MEDIA_TARGETS, type MediaTarget } from "../src/lib/media-bot/manifest";
import type { MediaNeed } from "../src/lib/media-bot/needs";
import { openAiCache, type AiCache } from "../src/lib/media-bot/worker/ai-cache";
import { domainsFromNeeds, prepareFolder, pushFolder, PUSH_RESULT_FILENAME } from "../src/lib/media-bot/worker/folder";
import { localAiConfig, localAiStatus, type LocalAiConfig } from "../src/lib/media-bot/worker/local-ai";
import { fetchMediaNeeds } from "../src/lib/media-bot/worker/needs-client";

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

const argv = process.argv.slice(2);
const command = argv[0] ?? "help";

function arg(name: string): string | undefined {
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3);
    if (a === `--${name}` && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  }
  return undefined;
}
function flag(name: string): boolean {
  return argv.includes(`--${name}`);
}
const log = (line: string) => console.error(`[media-bot] ${line}`);

function baseUrl(): string {
  return arg("base") ?? process.env.SUPLYMATE_URL ?? "https://suplymate.com";
}
function secret(): string {
  const s = arg("secret") ?? process.env.CRON_SECRET ?? "";
  if (!s) {
    log("CRON_SECRET (or --secret) is required to talk to Suplymate.");
    process.exit(1);
  }
  return s;
}
function industries(): string[] {
  const raw = arg("industries") ?? process.env.MEDIA_BOT_INDUSTRIES ?? "all";
  if (raw === "all") return [...MEDIA_INDUSTRY_IDS];
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = list.filter((i) => !(MEDIA_INDUSTRY_IDS as readonly string[]).includes(i));
  if (unknown.length) {
    log(`unknown industries: ${unknown.join(", ")} (known: ${MEDIA_INDUSTRY_IDS.join(", ")})`);
    process.exit(1);
  }
  return list;
}
function target(): MediaTarget | null {
  const t = arg("target");
  if (!t) return null;
  if (!(MEDIA_TARGETS as readonly string[]).includes(t)) {
    log(`--target must be one of ${MEDIA_TARGETS.join(", ")}`);
    process.exit(1);
  }
  return t as MediaTarget;
}

async function aiConfig(): Promise<LocalAiConfig | null> {
  if (flag("no-ai") || process.env.MEDIA_BOT_AI === "off") return null;
  const cfg = localAiConfig(process.env);
  const status = await localAiStatus(cfg);
  if (!status.ok) {
    log(`local AI unavailable (${status.detail}) — continuing without QA`);
    return null;
  }
  log(`local AI: ${status.detail} at ${cfg.baseUrl}`);
  return cfg;
}

function readNeedsFiles(paths: string[]): ReturnType<typeof domainsFromNeeds> | undefined {
  const files = paths.filter((p) => existsSync(p));
  if (!files.length) return undefined;
  return domainsFromNeeds(files.map((p) => JSON.parse(readFileSync(p, "utf8")) as { items?: MediaNeed[] }));
}

function needsFilesIn(dir: string | undefined): string[] {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => join(dir, f));
}

async function cmdNeeds() {
  const out = arg("out");
  const outDir = arg("out-dir");
  const list = arg("industry") ? [arg("industry")!] : industries();
  for (const industry of list) {
    const res = await fetchMediaNeeds({ baseUrl: baseUrl(), secret: secret(), industry, target: target() });
    log(`${industry}: ${res.total} entities need media (${res.withoutWebsite} without an official website)`);
    const json = `${JSON.stringify(res, null, 2)}\n`;
    if (outDir) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, `${industry}.json`), json);
    } else if (out && list.length === 1) {
      writeFileSync(out, json);
    } else {
      process.stdout.write(json);
    }
  }
}

async function cmdPrepare(cache: AiCache, dir: string, needs: string[]) {
  return prepareFolder({ dir, cache, ai: await aiConfig(), needs: readNeedsFiles(needs), log });
}

async function cmdPush(cache: AiCache, dir: string) {
  const result = await pushFolder({
    dir,
    baseUrl: baseUrl(),
    secret: secret(),
    cache,
    dryRun: flag("dry-run"),
    force: flag("force"),
    chunkBytes: Number(arg("chunk-bytes") ?? "") || undefined,
    log,
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
  return result;
}

/** Every inbox folder with a manifest that has not been fully pushed yet. */
function pendingFolders(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((name) => join(root, name))
    .filter((dir) => statSync(dir).isDirectory() && existsSync(join(dir, MEDIA_MANIFEST_FILENAME)))
    .filter((dir) => {
      const done = join(dir, PUSH_RESULT_FILENAME);
      if (!existsSync(done)) return true;
      try {
        return !(JSON.parse(readFileSync(done, "utf8")) as { ok?: boolean }).ok || statSync(join(dir, MEDIA_MANIFEST_FILENAME)).mtimeMs > statSync(done).mtimeMs;
      } catch {
        return true;
      }
    })
    .sort();
}

async function cmdRun(cache: AiCache) {
  const root = resolve(arg("root") ?? process.env.MEDIA_BOT_INBOX ?? "/data/media/inbox");
  const needsDir = arg("needs-dir") ?? process.env.MEDIA_BOT_NEEDS_DIR;
  if (needsDir && !flag("no-needs-refresh")) {
    mkdirSync(needsDir, { recursive: true });
    for (const industry of industries()) {
      try {
        const res = await fetchMediaNeeds({ baseUrl: baseUrl(), secret: secret(), industry });
        writeFileSync(join(needsDir, `${industry}.json`), `${JSON.stringify(res, null, 2)}\n`);
        log(`needs ${industry}: ${res.total}`);
      } catch (err) {
        log(`needs ${industry} failed: ${(err as Error).message}`);
      }
    }
  }
  const folders = pendingFolders(root);
  log(`${folders.length} folder(s) to process under ${root}`);
  let failed = 0;
  for (const dir of folders) {
    try {
      const report = await cmdPrepare(cache, dir, needsFilesIn(needsDir));
      if (report.prepared === 0) continue;
      const result = await cmdPush(cache, dir);
      if (!result.ok) failed++;
    } catch (err) {
      failed++;
      log(`${dir}: ${(err as Error).message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

async function cmdStatus(cache: AiCache) {
  const cfg = localAiConfig(process.env);
  const ai = await localAiStatus(cfg);
  console.log(JSON.stringify({ suplymate: baseUrl(), localAi: { ...cfg, ...ai }, cache: cache.kind, industries: MEDIA_INDUSTRY_IDS }, null, 2));
}

function help() {
  const lines = readFileSync(new URL(import.meta.url), "utf8").split("\n");
  const end = lines.findIndex((l) => !l.startsWith("//"));
  console.log(lines.slice(0, end).map((l) => l.slice(3)).join("\n"));
}

async function main() {
  if (command === "needs") return cmdNeeds();
  if (command === "help" || command === "--help") return help();
  const dir = arg("dir") ? resolve(arg("dir")!) : null;
  const cacheHome = dir ? join(dir, "..") : resolve(arg("root") ?? process.env.MEDIA_BOT_INBOX ?? process.cwd());
  const cache = openAiCache(process.env, join(cacheHome, ".media-bot-cache.json"));
  try {
    switch (command) {
      case "prepare":
        if (!dir) throw new Error("prepare needs --dir");
        await cmdPrepare(cache, dir, [arg("needs") ?? ""].filter(Boolean));
        break;
      case "push":
        if (!dir) throw new Error("push needs --dir");
        await cmdPush(cache, dir);
        break;
      case "run": {
        const every = Number(arg("every") ?? "");
        if (!(every > 0)) {
          await cmdRun(cache);
          break;
        }
        for (;;) {
          await cmdRun(cache).catch((err: Error) => log(`run failed: ${err.message}`));
          log(`next run in ${every} min`);
          await new Promise((r) => setTimeout(r, every * 60_000));
        }
      }
      case "status":
        await cmdStatus(cache);
        break;
      default:
        help();
        process.exitCode = 1;
    }
  } finally {
    await cache.close();
  }
}

main().catch((err) => {
  log((err as Error).message);
  process.exit(1);
});
