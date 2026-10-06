// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PackFiles } from "@/lib/import/pack-files";
import { AI_GENERATED_LABEL, AI_GENERATED_SORT_ORDER, ALIBABA_PHOTO_CAPTION } from "@/lib/image-attribution";
import { mediaOriginalUrl, runMediaPush, sha256Hex, type MediaPushSummary } from "../push";
import { fakeDeps, JPEG } from "./fake-deps";

const PLANT = "enhanced/supplier/posco/plant.jpg";
const item = (over: Record<string, unknown> = {}) => ({
  target: "supplier",
  entityId: "posco",
  role: "factory",
  file: PLANT,
  sourceUrl: "https://www.posco.com/en/plant",
  enhancement: "restore",
  ...over,
});

function files(map: Record<string, Buffer>): PackFiles {
  const f = new PackFiles();
  for (const [path, buf] of Object.entries(map)) f.add(path, buf);
  return f;
}

async function push(items: unknown[], fileMap: Record<string, Buffer>, ctx = fakeDeps(), dryRun = false) {
  const res = await runMediaPush({ manifest: { version: 1, bot: "image-enhancer", items }, files: files(fileMap), actor: "grok-bot", deps: ctx.deps, dryRun });
  if (!("counts" in res)) throw new Error(res.error);
  return { res: res as MediaPushSummary, ...ctx };
}

describe("runMediaPush", () => {
  it("stores a valid image unpublished under the enhanced prefix and audits it", async () => {
    const { res, state } = await push([item()], { [PLANT]: JPEG });
    expect(res.counts.imported).toBe(1);
    expect(res.ok).toBe(true);
    expect(state.media).toHaveLength(1);
    const m = state.media[0];
    expect(m).toMatchObject({ entityType: "SUPPLIER", entityId: "posco", mediaType: "SUPPLIER_FACTORY", status: "unpublished", uploadedBy: "grok-bot" });
    expect(m.originalUrl).toBe(mediaOriginalUrl({ sourceUrl: "https://www.posco.com/en/plant" }, sha256Hex(JPEG)));
    expect(state.stored[0].prefix).toBe("suppliers/enhanced/posco");
    expect(state.audit[0]).toMatchObject({ action: "enhance", detail: { provider: "grok-media-bot", enhancement: "restore", sourceUrl: "https://www.posco.com/en/plant" } });
  });

  it("never stores the same bytes twice for an entity", async () => {
    const ctx = fakeDeps();
    await push([item()], { [PLANT]: JPEG }, ctx);
    const { res, state } = await push([item({ sourceUrl: "https://www.posco.com/en/other-page" })], { [PLANT]: JPEG }, ctx);
    expect(res.items[0]).toMatchObject({ status: "skipped", reason: "same image already stored" });
    expect(state.media).toHaveLength(1);
  });

  it("defers items whose bytes are in another chunk", async () => {
    const { res, state } = await push([item()], {});
    expect(res.items[0].status).toBe("deferred");
    expect(res.ok).toBe(true);
    expect(state.media).toHaveLength(0);
  });

  it("rejects bad hashes, unknown entities, foreign sources, marketplaces and QA red flags", async () => {
    const { res, state } = await push(
      [
        item({ sha256: "0".repeat(64) }),
        item({ entityId: "ghost" }),
        item({ sourceUrl: "https://steel-blog.example/posco" }),
        item({ sourceUrl: "https://posco.en.alibaba.com/photo" }),
        item({ imageUrl: "https://sc04.alicdn.com/kf/x.jpg" }),
        item({ qa: { model: "llama3.2-vision", quality: 4, matchesRole: true, marketplaceWatermark: true } }),
        item({ qa: { model: "llama3.2-vision", quality: 1, matchesRole: true, marketplaceWatermark: false } }),
        item({ entityId: "no-site" }),
        item({ enhancement: "generative" }),
      ],
      { [PLANT]: JPEG }
    );
    expect(res.items.map((r) => r.status)).toEqual(Array(9).fill("rejected"));
    expect(res.items.map((r) => r.reason)).toEqual([
      expect.stringMatching(/sha256/),
      expect.stringMatching(/unknown supplier "ghost"/),
      expect.stringMatching(/not on the entity's official website/),
      expect.stringMatching(/marketplaces/),
      expect.stringMatching(/marketplaces/),
      expect.stringMatching(/watermark/),
      expect.stringMatching(/quality 1\/5/),
      expect.stringMatching(/no official website/),
      expect.stringMatching(/generative/),
    ]);
    expect(state.media).toHaveLength(0);
  });

  it("attaches supplier certificate scans to a claimed Certification row", async () => {
    const certFile = "enhanced/supplier/posco/iso9001.jpg";
    const cert = item({ role: "certificate", file: certFile, enhancement: "none", certification: { name: "ISO 9001", issuingOrg: "DNV" } });
    const ctx = fakeDeps();
    const { res, state } = await push([cert], { [certFile]: JPEG }, ctx);
    expect(res.items[0]).toMatchObject({ status: "imported", certificationId: "cert_1", certificationCreated: true });
    expect(state.certifications[0]).toMatchObject({ supplierId: "posco", name: "ISO 9001", status: "claimed" });
    expect(state.media[0]).toMatchObject({ entityType: "CERTIFICATION", entityId: "cert_1", mediaType: "CERTIFICATION" });
    expect(state.stored[0].prefix).toBe("certifications/cert_1");
    expect(state.audit[0].action).toBe("bot_media");

    const again = await push([{ ...cert, certification: { name: "iso 9001" } }], { [certFile]: JPEG }, ctx);
    expect(again.res.items[0]).toMatchObject({ status: "skipped", certificationId: "cert_1", certificationCreated: false });
  });

  it("refuses certificates for suppliers that only exist in the bundled dataset", async () => {
    const certFile = "enhanced/supplier/bundled-mill/iso.jpg";
    const { res } = await push(
      [item({ entityId: "bundled-mill", role: "certificate", file: certFile, enhancement: "none", sourceUrl: "https://bundledmill.com/quality", certification: { name: "ISO 9001" } })],
      { [certFile]: JPEG }
    );
    expect(res.items[0]).toMatchObject({ status: "rejected", reason: expect.stringMatching(/not in the database/) });
  });

  it("stores logistics-provider logos under their own entity type", async () => {
    const logo = "enhanced/logistics-provider/falvey-cargo/logo.png";
    const { res, state } = await push(
      [item({ target: "logistics-provider", entityId: "falvey-cargo", role: "logo", file: logo, enhancement: "resize", sourceUrl: "https://www.falveycargo.com/" })],
      { [logo]: JPEG }
    );
    expect(res.counts.imported).toBe(1);
    expect(state.media[0]).toMatchObject({ entityType: "LOGISTICS_PROVIDER", entityId: "falvey-cargo", mediaType: "PROVIDER_LOGO", altText: "Falvey Cargo logo" });
    expect(state.stored[0].prefix).toBe("logistics/enhanced/falvey-cargo");
  });

  it("reports storage failures as failed so the bot retries", async () => {
    const { res } = await push([item()], { [PLANT]: JPEG }, fakeDeps({ storageOk: false }));
    expect(res.ok).toBe(false);
    expect(res.items[0]).toMatchObject({ status: "failed", reason: expect.stringMatching(/no storage provider/) });
  });

  it("writes nothing on a dry run", async () => {
    const { res, state } = await push([item()], { [PLANT]: JPEG }, fakeDeps(), true);
    expect(res.items[0].status).toBe("would-import");
    expect(state.media).toHaveLength(0);
    expect(state.stored).toHaveLength(0);
  });

  it("accepts photos from the supplier's own Alibaba store and still blocks other marketplaces", async () => {
    const file = "enhanced/supplier/acme-store/coil.jpg";
    const other = "enhanced/supplier/acme-store/other.jpg";
    const { res, state } = await push(
      [
        item({
          entityId: "acme-store",
          role: "gallery",
          file,
          sourceUrl: "https://acme.en.alibaba.com/product/coil.html",
          imageUrl: "https://sc04.alicdn.com/kf/coil.jpg",
          enhancement: "none",
          qa: { model: "llama3.2-vision", quality: 4, matchesRole: true, marketplaceWatermark: true, notes: "Alibaba store watermark" },
        }),
      ],
      { [file]: JPEG },
    );
    expect(res.counts.imported).toBe(1);
    expect(state.media[0].photoSource).toBe("alibaba-store");
    expect(state.media[0].caption).toBe(ALIBABA_PHOTO_CAPTION);
    expect(state.media[0].originalUrl).toContain("photoSource=alibaba-store");

    const blocked = await push(
      [
        item({ entityId: "acme-store", role: "gallery", file, sourceUrl: "https://acme.en.made-in-china.com/product/1.html", enhancement: "none" }),
        item({ entityId: "acme-store", role: "gallery", file: other, sourceUrl: "https://other.en.alibaba.com/product/1.html", enhancement: "none" }),
        item({ entityId: "posco", sourceUrl: "https://posco.en.alibaba.com/photo" }),
      ],
      { [file]: JPEG, [other]: JPEG, [PLANT]: JPEG },
    );
    expect(blocked.res.items.map((row) => row.status)).toEqual(["rejected", "rejected", "rejected"]);
    expect(blocked.res.items.map((row) => row.reason)).toEqual([
      expect.stringMatching(/marketplaces/),
      expect.stringMatching(/marketplaces/),
      expect.stringMatching(/marketplaces/),
    ]);
  });

  it("accepts labelled AI product images and rejects them for other roles", async () => {
    const file = "enhanced/product/posco-hrc/illus.jpg";
    const { res, state } = await push(
      [
        item({
          target: "product",
          entityId: "posco-hrc",
          role: "product",
          file,
          enhancement: "ai-generated",
          aiGenerated: true,
          sourceUrl: "https://www.posco.com/products/hrc",
        }),
      ],
      { [file]: JPEG },
    );
    expect(res.items[0].status).toBe("imported");
    expect(state.media[0].aiGenerated).toBe(true);
    expect(state.media[0].sortOrder).toBe(AI_GENERATED_SORT_ORDER);
    expect(state.media[0].altText).toContain(AI_GENERATED_LABEL);

    const bad = await push(
      [
        item({ role: "logo", file: "enhanced/supplier/posco/logo.png", enhancement: "ai-generated", aiGenerated: true }),
        item({ role: "factory", enhancement: "ai-generated", aiGenerated: true }),
      ],
      { [PLANT]: JPEG, "enhanced/supplier/posco/logo.png": JPEG },
    );
    expect(bad.res.items.map((row) => row.status)).toEqual(["rejected", "rejected"]);
  });

  it("rejects a malformed manifest as a whole", async () => {
    const res = await runMediaPush({ manifest: { version: 1 }, files: files({}), actor: "grok-bot", deps: fakeDeps().deps });
    expect(res).toEqual({ ok: false, error: expect.stringMatching(/items array/) });
  });
});
