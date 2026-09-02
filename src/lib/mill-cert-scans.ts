/**
 * Mill certificate scans under public/images/certs/<slug>/.
 *
 * Only mills with real JPG scans get a gallery. Never invent badges for
 * not_found mills, Ferrite, APL Apollo (expired plant ISOs), or EMSTEEL
 * (CARES PDFs not staged). Foliflex prefers the current ISO over PCMS 2018.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import certIndex from "../../data/certifications.json";

export type MillCertScan = {
  supplierSlug: string;
  supplierId: string;
  name: string;
  certType: string | null;
  publicPath: string;
  sourceUrl: string | null;
};

/** Lister / certs folder slug → phase-1 supplier id. */
export const CERT_SUPPLIER_ID_BY_SLUG: Record<string, string> = {
  "al-gharbia-pipe": "al-gharbia-pipe-company-llc-ae",
  hadeed: "saudi-iron-and-steel-company-hadeed-sa",
  "foliflex-cables": "foliflex-wires-cables-delhi",
  "qatar-steel": "qatar-steel-company-q-p-s-c-qa",
  "ratnamani-metals-tubes": "ratnamani-metals-tubes-limited-in",
  "hangxiao-steel-structure-shandong": "hangxiao-steel-structure-shandong-co-ltd-cn",
  "commercial-metals-company": "commercial-metals-company",
  "heidelberg-materials": "heidelberg-materials-ag",
  "polycab-india": "tegh-cables-india-pvt-ltd-polycab-cables-wires-distributor-m",
  "rr-kabel": "sudkabel-gmbh-kabelsysteme-kabel-und-kabelgarnituren-mannhei",
  uflex: "uflex-limited-in",
  "xwa-power-cable": "xwa-power-cable-co-ltd-cn",
  "aj-steel": "aj-steel-icad2-ae",
  "ezz-steel": "ezz-steel-eg",
  "kei-industries": "kei-industries-limited-in",
  "man-industries": "man-industries-india-limited-in",
  "al-jazeera-steel": "al-jazeera-steel-products-co-saog-om",
  "tata-steel": "tata-steel-limited-in",
  "zhejiang-zhiju-pipeline": "zhejiang-zhiju-pipeline-industry-co-ltd-cn",
  "hebei-huayang-steel-pipe": "hebei-huayang-steel-pipe-co-ltd-cn",
  "arabian-pipes": "arabian-pipes-company-sa",
};

/** No gallery even if a folder appears later. */
export const CERT_GALLERY_BLOCKED_SLUGS = new Set([
  "ferrite-structural-steels",
  "ferrite",
  "apl-apollo",
  "emsteel",
]);

type IndexRow = {
  supplier_slug?: string;
  cert_name?: string;
  cert_type?: string | null;
  source_url?: string | null;
  local_path?: string;
  status?: string;
};

function certsRoot(): string {
  return join(process.cwd(), "public", "images", "certs");
}

function titleFromFilename(filename: string): string {
  const stem = filename.replace(/\.(jpe?g|png|webp)$/i, "");
  return stem
    .split("-")
    .map((part) => {
      const upper = part.toUpperCase();
      if (
        /^(API|ISO|CE|UL|BIS|PED|TUV|CARES|IATF|ASTM|EN|HSE|CQM|ACRS|FM|ROHS|BASEC|Q1)$/.test(
          upper,
        )
      ) {
        return upper;
      }
      if (/^\d/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function shouldIncludeFile(slug: string, filename: string): boolean {
  if (CERT_GALLERY_BLOCKED_SLUGS.has(slug)) return false;
  if (slug === "foliflex-cables" && /pcms-2018/i.test(filename)) return false;
  return true;
}

function foliflexRank(filename: string): number {
  if (/^iso-9001\.jpg$/i.test(filename)) return 0;
  if (/iso-9001-aap/i.test(filename)) return 1;
  if (/pcms-2018/i.test(filename)) return 99;
  return 10;
}

function indexMetaByFile(): Map<string, IndexRow> {
  const found = ((certIndex as { found?: IndexRow[] }).found ?? []).filter(
    (row) => row.status === "found" || !row.status,
  );
  const map = new Map<string, IndexRow>();
  for (const row of found) {
    const slug = row.supplier_slug;
    const file = (row.local_path ?? "").split("/").pop();
    if (!slug || !file) continue;
    map.set(`${slug}/${file}`, row);
  }
  return map;
}

function listScanFiles(): { slug: string; filename: string }[] {
  const root = certsRoot();
  if (!existsSync(root)) return [];
  const out: { slug: string; filename: string }[] = [];
  for (const slug of readdirSync(root)) {
    if (CERT_GALLERY_BLOCKED_SLUGS.has(slug)) continue;
    const dir = join(root, slug);
    let files: string[] = [];
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    for (const filename of files) {
      if (!/\.(jpe?g|png|webp)$/i.test(filename)) continue;
      if (!shouldIncludeFile(slug, filename)) continue;
      out.push({ slug, filename });
    }
  }
  return out;
}

function buildScans(): MillCertScan[] {
  const meta = indexMetaByFile();
  const scans: MillCertScan[] = [];
  for (const { slug, filename } of listScanFiles()) {
    const supplierId = CERT_SUPPLIER_ID_BY_SLUG[slug];
    if (!supplierId) continue;
    const row = meta.get(`${slug}/${filename}`);
    scans.push({
      supplierSlug: slug,
      supplierId,
      name: row?.cert_name || titleFromFilename(filename),
      certType: row?.cert_type ?? null,
      publicPath: `/images/certs/${slug}/${filename}`,
      sourceUrl: row?.source_url ?? null,
    });
  }
  return scans.sort((a, b) => {
    if (a.supplierSlug !== b.supplierSlug) {
      return a.supplierSlug.localeCompare(b.supplierSlug);
    }
    if (a.supplierSlug === "foliflex-cables") {
      const fa = a.publicPath.split("/").pop() ?? "";
      const fb = b.publicPath.split("/").pop() ?? "";
      const ra = foliflexRank(fa) - foliflexRank(fb);
      if (ra !== 0) return ra;
    }
    return a.name.localeCompare(b.name);
  });
}

const ALL_SCANS = buildScans();

const BY_SUPPLIER_ID = new Map<string, MillCertScan[]>();
for (const scan of ALL_SCANS) {
  const list = BY_SUPPLIER_ID.get(scan.supplierId) ?? [];
  list.push(scan);
  BY_SUPPLIER_ID.set(scan.supplierId, list);
}

export function listAllMillCertScans(): MillCertScan[] {
  return ALL_SCANS;
}

export function listMillCertScansForSupplier(supplierId: string): MillCertScan[] {
  return BY_SUPPLIER_ID.get(supplierId) ?? [];
}

export function millCertImageUrlsForSupplier(supplierId: string): string[] {
  return listMillCertScansForSupplier(supplierId).map((c) => c.publicPath);
}
