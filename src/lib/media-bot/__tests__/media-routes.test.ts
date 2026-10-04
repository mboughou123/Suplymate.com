// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDeps, JPEG, type FakeState } from "./fake-deps";
import type { MediaNeedsInput } from "../needs";

const ctx: { current: ReturnType<typeof fakeDeps>; audits: unknown[] } = { current: fakeDeps(), audits: [] };

vi.mock("@/lib/admin", async () => {
  const { NextResponse } = await import("next/server");
  return {
    checkAdmin: async () => ({ ok: false, authenticated: false, session: null, email: null }),
    adminGuard: async () => NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
});
vi.mock("@/lib/media-bot/server-deps", () => ({ serverMediaPushDeps: () => ctx.current.deps }));
vi.mock("@/lib/media-store", () => ({ logMediaAudit: async (e: unknown) => void ctx.audits.push(e) }));
vi.mock("@/lib/image-storage", () => ({ storageProviderStatus: () => ({ provider: "vercel-blob", configured: true }) }));
vi.mock("@/lib/media-bot/needs-loader", () => ({
  loadMediaNeedsInput: async (): Promise<MediaNeedsInput> => ({
    suppliers: [{ id: "posco", name: "POSCO", website: "https://www.posco.com", category: "Steel & Metals", hasLegacyLogo: false, legacyPhotoCount: 0, certificates: [] }],
    products: [],
    providers: [{ id: "falvey-cargo", name: "Falvey Cargo", urls: ["https://www.falveycargo.com/"] }],
    media: [],
  }),
}));

import { GET as needsGET } from "@/app/api/admin/import/media-needs/route";
import { GET as mediaGET, POST as mediaPOST } from "@/app/api/admin/import/media/route";

const SECRET = "media-bot-secret";
const bearer = { authorization: `Bearer ${SECRET}` };
const FILE = "enhanced/supplier/posco/plant.jpg";
const manifest = {
  version: 1,
  bot: "image-enhancer",
  industry: "metals",
  items: [{ target: "supplier", entityId: "posco", role: "factory", file: FILE, sourceUrl: "https://www.posco.com/plant", enhancement: "restore" }],
};

function multipart(parts: { manifest?: unknown; files?: Record<string, Buffer>; dryRun?: boolean }, headers: Record<string, string> = bearer) {
  const form = new FormData();
  if (parts.manifest) form.set("manifest", new Blob([JSON.stringify(parts.manifest)], { type: "application/json" }), "media-manifest.json");
  if (parts.dryRun) form.set("dryRun", "true");
  for (const [path, buf] of Object.entries(parts.files ?? {})) form.append(path, new Blob([new Uint8Array(buf)], { type: "image/jpeg" }), path.split("/").pop());
  return new Request("http://localhost/api/admin/import/media", { method: "POST", body: form, headers });
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  ctx.current = fakeDeps();
  ctx.audits = [];
});

describe("POST /api/admin/import/media", () => {
  it("refuses requests without the bot secret or an admin session", async () => {
    const res = await mediaPOST(multipart({ manifest, files: { [FILE]: JPEG } }, { authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect((ctx.current.state as FakeState).media).toHaveLength(0);
  });

  it("imports a pushed chunk unpublished and records the push", async () => {
    const res = await mediaPOST(multipart({ manifest, files: { [FILE]: JPEG } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, actor: "grok-bot", bot: "image-enhancer", industry: "metals", counts: { imported: 1 } });
    expect(ctx.current.state.media[0]).toMatchObject({ status: "unpublished", mediaType: "SUPPLIER_FACTORY" });
    expect(ctx.audits).toEqual([expect.objectContaining({ action: "media_push", adminUser: "grok-bot" })]);
  });

  it("supports dry runs without writing or auditing", async () => {
    const res = await mediaPOST(multipart({ manifest, files: { [FILE]: JPEG }, dryRun: true }));
    expect((await res.json()).counts["would-import"]).toBe(1);
    expect(ctx.current.state.media).toHaveLength(0);
    expect(ctx.audits).toHaveLength(0);
  });

  it("explains a missing manifest", async () => {
    const res = await mediaPOST(multipart({ files: { [FILE]: JPEG } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/media-manifest.json/);
  });

  it("accepts a JSON body with data: URLs", async () => {
    const req = new Request("http://localhost/api/admin/import/media", {
      method: "POST",
      headers: { ...bearer, "content-type": "application/json" },
      body: JSON.stringify({ manifest, files: { [FILE]: `data:image/jpeg;base64,${JPEG.toString("base64")}` } }),
    });
    const body = await (await mediaPOST(req)).json();
    expect(body.counts.imported).toBe(1);
  });
});

describe("GET /api/admin/import/media", () => {
  it("publishes the contract to the bots", async () => {
    const body = await (await mediaGET(new Request("http://localhost/api/admin/import/media", { headers: bearer }))).json();
    expect(body.targets["logistics-provider"]).toEqual(["logo"]);
    expect(body.enhancements.certificate).toEqual(["none", "resize"]);
    expect(body.blockedSources).toContain("alibaba.com");
  });
});

describe("GET /api/admin/import/media-needs", () => {
  it("returns the per-industry list", async () => {
    const res = await needsGET(new Request("http://localhost/api/admin/import/media-needs?industry=metals", { headers: bearer }));
    const body = await res.json();
    expect(body.industry).toBe("metals");
    expect(body.items).toEqual([expect.objectContaining({ entityId: "posco", roles: ["logo", "factory", "gallery"] })]);
  });

  it("pages with the default limit when none is given", async () => {
    const all = await (await needsGET(new Request("http://localhost/api/admin/import/media-needs", { headers: bearer }))).json();
    expect(all.limit).toBe(200);
    expect(all.items.map((i: { entityId: string }) => i.entityId).sort()).toEqual(["falvey-cargo", "posco"]);
    const one = await (await needsGET(new Request("http://localhost/api/admin/import/media-needs?limit=1&offset=1", { headers: bearer }))).json();
    expect(one).toMatchObject({ limit: 1, offset: 1, total: 2 });
    expect(one.items).toHaveLength(1);
  });

  it("validates industry and target", async () => {
    expect((await needsGET(new Request("http://localhost/api/admin/import/media-needs?industry=toys", { headers: bearer }))).status).toBe(400);
    expect((await needsGET(new Request("http://localhost/api/admin/import/media-needs?target=user", { headers: bearer }))).status).toBe(400);
  });

  it("requires auth", async () => {
    expect((await needsGET(new Request("http://localhost/api/admin/import/media-needs"))).status).toBe(401);
  });
});
