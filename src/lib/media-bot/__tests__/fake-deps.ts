import type { Media } from "@/lib/media-types";
import type { ResolvedEntity } from "../entities";
import type { MediaPushDeps } from "../push";

export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x42]);

export const ENTITIES: ResolvedEntity[] = [
  { target: "supplier", id: "posco", name: "POSCO", officialDomains: ["posco.com"], industry: "metals", supplierId: "posco", supplierInDatabase: true, alibabaStoreHost: null },
  { target: "supplier", id: "acme-store", name: "Acme Store", officialDomains: [], industry: "metals", supplierId: "acme-store", supplierInDatabase: true, alibabaStoreHost: "acme.en.alibaba.com" },
  { target: "supplier", id: "bundled-mill", name: "Bundled Mill", officialDomains: ["bundledmill.com"], industry: "metals", supplierId: "bundled-mill", supplierInDatabase: false, alibabaStoreHost: null },
  { target: "supplier", id: "no-site", name: "No Site Co", officialDomains: [], industry: "packaging", supplierId: "no-site", supplierInDatabase: true, alibabaStoreHost: null },
  { target: "product", id: "posco-hrc", name: "POSCO Hot-Rolled Coil", officialDomains: ["posco.com"], industry: "metals", supplierId: "posco", supplierInDatabase: true, alibabaStoreHost: null },
  { target: "logistics-provider", id: "falvey-cargo", name: "Falvey Cargo", officialDomains: ["falveycargo.com", "falveyinsurancegroup.com"], industry: "logistics-insurance", supplierInDatabase: false, alibabaStoreHost: null },
];

export type FakeState = {
  media: Media[];
  certifications: { id: string; supplierId: string; name: string; sourceUrl: string; status: string }[];
  audit: { action: string; entityType?: string | null; entityId?: string | null; detail: Record<string, unknown> }[];
  stored: { prefix: string; filename: string; bytes: number }[];
};

export function fakeDeps(opts: { storageOk?: boolean } = {}): { deps: MediaPushDeps; state: FakeState } {
  const state: FakeState = { media: [], certifications: [], audit: [], stored: [] };
  let n = 0;
  const deps: MediaPushDeps = {
    async resolveEntity(target, id) {
      return ENTITIES.find((e) => e.target === target && e.id === id) ?? null;
    },
    async ensureCertification(supplierId, meta, sourceUrl) {
      const hit = state.certifications.find((c) => c.supplierId === supplierId && c.name.toLowerCase() === meta.name.toLowerCase());
      if (hit) return { id: hit.id, created: false };
      const id = `cert_${state.certifications.length + 1}`;
      state.certifications.push({ id, supplierId, name: meta.name, sourceUrl, status: "claimed" });
      return { id, created: true };
    },
    async existingKeys(entityType, entityId) {
      const set = new Set<string>();
      for (const m of state.media) {
        if (m.entityType !== entityType || m.entityId !== entityId) continue;
        set.add(m.url);
        if (m.originalUrl) set.add(m.originalUrl);
      }
      return set;
    },
    async storeBytes(buffer, o) {
      if (opts.storageOk === false) return { ok: false, reason: "no storage provider configured for uploaded files" };
      state.stored.push({ prefix: o.prefix, filename: o.filename, bytes: buffer.byteLength });
      const key = `${o.prefix}/${o.filename}`;
      return { ok: true, url: `https://blob.example/${key}`, storageKey: key, mimeType: "image/jpeg", fileSize: buffer.byteLength };
    },
    async createMedia(input) {
      const now = new Date().toISOString();
      const m: Media = {
        id: `m_${++n}`,
        ...input,
        sortOrder: input.sortOrder ?? 0,
        isPrimary: false,
        status: "unpublished",
        aiGenerated: Boolean(input.aiGenerated),
        photoSource: input.photoSource ?? null,
        createdAt: now,
        updatedAt: now,
      };
      state.media.push(m);
      return m;
    },
    async audit(entry) {
      state.audit.push(entry);
    },
  };
  return { deps, state };
}
