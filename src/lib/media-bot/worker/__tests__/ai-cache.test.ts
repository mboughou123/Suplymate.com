// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AI_CACHE_SCHEMA, FileAiCache, PostgresAiCache, openAiCache, type Queryable } from "../ai-cache";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("FileAiCache", () => {
  it("persists results and push fingerprints across instances", async () => {
    const dir = mkdtempSync(join(tmpdir(), "media-bot-cache-"));
    dirs.push(dir);
    const path = join(dir, "cache.json");
    const a = new FileAiCache(path);
    await a.setResult("k1", { task: "qa", model: "m", inputSha256: "s", result: { quality: 4 } });
    await a.markPushed({ sha256: "abc", target: "supplier", entityId: "posco", role: "logo" });
    await a.close();

    const b = new FileAiCache(path);
    expect(b.kind).toBe("file");
    expect(await b.getResult("k1")).toEqual({ quality: 4 });
    expect(await b.getResult("missing")).toBeNull();
    expect(await b.wasPushed("abc", "supplier", "posco")).toBe(true);
    expect(await b.wasPushed("abc", "product", "posco")).toBe(false);
  });

  it("works in memory", async () => {
    const c = new FileAiCache(null);
    expect(c.kind).toBe("memory");
    await c.markPushed({ sha256: "x", target: "product", entityId: "p", role: "product" });
    expect(await c.wasPushed("x", "product", "p")).toBe(true);
  });
});

describe("PostgresAiCache", () => {
  it("creates its own tables once and uses parameterised queries", async () => {
    const calls: { text: string; params?: unknown[] }[] = [];
    const db: Queryable = {
      async query(text, params) {
        calls.push({ text, params });
        if (text.startsWith("SELECT result")) return { rows: [{ result: { quality: 5 } }] };
        if (text.startsWith("SELECT 1")) return { rows: [] };
        return { rows: [] };
      },
    };
    const cache = new PostgresAiCache(db);
    expect(await cache.getResult("k")).toEqual({ quality: 5 });
    expect(await cache.wasPushed("HASH-VALUE-1", "supplier", "ENTITY-VALUE-1")).toBe(false);
    await cache.setResult("k", { task: "qa", model: "m", inputSha256: "HASH-VALUE-1", result: { quality: 5 } });
    await cache.markPushed({ sha256: "HASH-VALUE-1", target: "supplier", entityId: "ENTITY-VALUE-1", role: "logo", mediaId: "m_1" });

    const ddl = calls.filter((c) => c.text.startsWith("CREATE"));
    expect(ddl.map((c) => c.text)).toEqual(AI_CACHE_SCHEMA);
    expect(calls.every((c) => !/HASH-VALUE|ENTITY-VALUE/.test(c.text))).toBe(true);
    expect(calls.at(-1)?.params).toEqual(["HASH-VALUE-1", "supplier", "ENTITY-VALUE-1", "logo", null, "m_1"]);
  });
});

describe("openAiCache", () => {
  it("falls back to a file and refuses to share Suplymate's database", () => {
    expect(openAiCache({}, null).kind).toBe("memory");
    expect(openAiCache({ MEDIA_BOT_CACHE_FILE: "/tmp/x.json" }, null).kind).toBe("file");
    expect(() => openAiCache({ AI_CACHE_DATABASE_URL: "postgres://a/b", DATABASE_URL: "postgres://a/b" }, null)).toThrow(/separate database/);
  });
});
