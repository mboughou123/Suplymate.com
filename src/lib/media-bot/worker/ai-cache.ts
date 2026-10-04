// The media bot's own database: local-AI results (so an image is reviewed once
// per model/prompt) and fingerprints of what was already pushed (so a re-run
// uploads nothing twice). It is deliberately NOT Suplymate's database: set
// AI_CACHE_DATABASE_URL to a separate Postgres (docker-compose / k8s ship one),
// or leave it unset to use a JSON file next to the packs.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Pool } from "pg";

export type AiResultEntry = { task: string; model: string; inputSha256: string; result: unknown };
export type PushedEntry = { sha256: string; target: string; entityId: string; role: string; sourceUrl?: string | null; mediaId?: string | null };

export interface AiCache {
  readonly kind: "postgres" | "file" | "memory";
  getResult(key: string): Promise<unknown | null>;
  setResult(key: string, entry: AiResultEntry): Promise<void>;
  wasPushed(sha256: string, target: string, entityId: string): Promise<boolean>;
  markPushed(entry: PushedEntry): Promise<void>;
  close(): Promise<void>;
}

export const AI_CACHE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS media_bot_ai_results (
    cache_key text PRIMARY KEY,
    task text NOT NULL,
    model text NOT NULL,
    input_sha256 text NOT NULL,
    result jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS media_bot_ai_results_input ON media_bot_ai_results (input_sha256)`,
  `CREATE TABLE IF NOT EXISTS media_bot_pushed (
    sha256 text NOT NULL,
    target text NOT NULL,
    entity_id text NOT NULL,
    role text NOT NULL,
    source_url text,
    media_id text,
    pushed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (sha256, target, entity_id)
  )`,
];

/** The subset of pg's Pool the cache uses (lets tests pass a fake). */
export type Queryable = {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  end?(): Promise<void>;
};

export class PostgresAiCache implements AiCache {
  readonly kind = "postgres" as const;
  private ready: Promise<void> | null = null;

  constructor(private readonly db: Queryable) {}

  private init(): Promise<void> {
    this.ready ??= (async () => {
      for (const sql of AI_CACHE_SCHEMA) await this.db.query(sql);
    })();
    return this.ready;
  }

  async getResult(key: string): Promise<unknown | null> {
    await this.init();
    const { rows } = await this.db.query("SELECT result FROM media_bot_ai_results WHERE cache_key = $1", [key]);
    return rows[0]?.result ?? null;
  }

  async setResult(key: string, e: AiResultEntry): Promise<void> {
    await this.init();
    await this.db.query(
      `INSERT INTO media_bot_ai_results (cache_key, task, model, input_sha256, result) VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (cache_key) DO UPDATE SET result = EXCLUDED.result, created_at = now()`,
      [key, e.task, e.model, e.inputSha256, JSON.stringify(e.result)]
    );
  }

  async wasPushed(sha256: string, target: string, entityId: string): Promise<boolean> {
    await this.init();
    const { rows } = await this.db.query("SELECT 1 FROM media_bot_pushed WHERE sha256 = $1 AND target = $2 AND entity_id = $3", [sha256, target, entityId]);
    return rows.length > 0;
  }

  async markPushed(e: PushedEntry): Promise<void> {
    await this.init();
    await this.db.query(
      `INSERT INTO media_bot_pushed (sha256, target, entity_id, role, source_url, media_id) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (sha256, target, entity_id) DO UPDATE SET media_id = COALESCE(EXCLUDED.media_id, media_bot_pushed.media_id)`,
      [e.sha256, e.target, e.entityId, e.role, e.sourceUrl ?? null, e.mediaId ?? null]
    );
  }

  async close(): Promise<void> {
    await this.db.end?.();
  }
}

type FileShape = { results: Record<string, AiResultEntry & { at: string }>; pushed: Record<string, PushedEntry & { at: string }> };

export class FileAiCache implements AiCache {
  readonly kind: "file" | "memory";
  private data: FileShape | null = null;

  /** `path: null` keeps everything in memory (tests, --no-cache). */
  constructor(private readonly path: string | null) {
    this.kind = path ? "file" : "memory";
  }

  private load(): FileShape {
    if (this.data) return this.data;
    this.data = { results: {}, pushed: {} };
    if (this.path && existsSync(this.path)) {
      try {
        const parsed = JSON.parse(readFileSync(this.path, "utf8")) as Partial<FileShape>;
        this.data = { results: parsed.results ?? {}, pushed: parsed.pushed ?? {} };
      } catch {
        // corrupt cache: start over rather than block the bot
      }
    }
    return this.data;
  }

  private save() {
    if (!this.path || !this.data) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, this.path);
  }

  async getResult(key: string): Promise<unknown | null> {
    return this.load().results[key]?.result ?? null;
  }

  async setResult(key: string, e: AiResultEntry): Promise<void> {
    this.load().results[key] = { ...e, at: new Date().toISOString() };
    this.save();
  }

  async wasPushed(sha256: string, target: string, entityId: string): Promise<boolean> {
    return Boolean(this.load().pushed[`${sha256}:${target}:${entityId}`]);
  }

  async markPushed(e: PushedEntry): Promise<void> {
    this.load().pushed[`${e.sha256}:${e.target}:${e.entityId}`] = { ...e, at: new Date().toISOString() };
    this.save();
  }

  async close(): Promise<void> {
    this.save();
  }
}

/**
 * AI_CACHE_DATABASE_URL → Postgres; otherwise a JSON file (MEDIA_BOT_CACHE_FILE
 * or `fallbackFile`). Refuses to share Suplymate's own DATABASE_URL.
 */
export function openAiCache(env: Record<string, string | undefined>, fallbackFile: string | null): AiCache {
  const url = env.AI_CACHE_DATABASE_URL?.trim();
  if (url) {
    if (env.DATABASE_URL?.trim() && url === env.DATABASE_URL.trim()) {
      throw new Error("AI_CACHE_DATABASE_URL must point to a separate database, not Suplymate's DATABASE_URL.");
    }
    return new PostgresAiCache(new Pool({ connectionString: url, max: 4 }));
  }
  return new FileAiCache(env.MEDIA_BOT_CACHE_FILE?.trim() || fallbackFile);
}
