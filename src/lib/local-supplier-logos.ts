/**
 * Local logo assets under `public/images/suppliers/logos/logo-{slug}.png`.
 * Prefer these over remote CSV `logoUrl` banners whenever a file exists.
 *
 * Later batches: drop `logo-{slug}.png` in that folder and add one
 * `supplierId → slug` line to LOGO_SLUG_BY_ID below. White-on-dark reverse
 * marks also go in DARK_CHIP_LOGO_IDS so they stay visible on light cards.
 */

/** Explicit id → filename slug for the curated logo pack. */
export const LOGO_SLUG_BY_ID: Record<string, string> = {
  // Seeds (homepage band)
  "al-gharbia-pipe-company-llc-ae": "al-gharbia",
  "emsteel-building-materials-pjsc-emsteel-ae": "emsteel",
  "ferrite-structural-steels-pvt-ltd-panvel": "ferrite",
  "foliflex-wires-cables-delhi": "foliflex",

  // Batch 2 — tubes & pipes / steel
  "aj-steel-icad2-ae": "aj-steel",
  "jindal-saw-limited-in": "jindal-saw",
  "welspun-corp-limited-in": "welspun",
  "arabian-pipes-company-sa": "arabian-pipes",
  "apl-apollo-tubes-limited-in": "apl-apollo",
  "man-industries-india-limited-in": "man-industries",
  "hebei-huayang-steel-pipe-co-ltd-cn": "huayang",
  "al-jazeera-steel-products-co-saog-om": "al-jazeera",
  "ratnamani-metals-tubes-limited-in": "ratnamani",
  "qatar-steel-company-q-p-s-c-qa": "qatar-steel",

  // Later batches from starting-branch pack
  "jsw-steel-limited-in": "jsw",
  "saudi-iron-and-steel-company-hadeed-sa": "hadeed",
  "tata-steel-limited-in": "tata-steel",
  "jingye-steel-jingye-group-cn": "jingye",
  "ispat-alloys-tube-industries-mumbai": "vizag",
  "jindal-steel-limited-formerly-jindal-steel-power-l-in": "jindal-steel",
  "ezz-steel-eg": "ezz-steel",
  "kei-industries-limited-in": "kei",
  "tegh-cables-india-pvt-ltd-polycab-cables-wires-distributor-m": "polycab",
  "sudkabel-gmbh-kabelsysteme-kabel-und-kabelgarnituren-mannhei": "rr-kabel",
  "jiangsu-yuhui-cable-co-ltd-cn": "yuhui",
  "shanghai-shenghua-cable-group-co-ltd-cn": "shenghua",
  "xwa-power-cable-co-ltd-cn": "xwa",
  "henan-huadong-cable-co-ltd-cn": "huadong",
  "shandong-new-luxing-cable-co-ltd-cn": "luxing",
  "people-s-cable-group-co-ltd-cn": "peoples-cable",
  "ultratech-cement-limited-in": "ultratech",
  "cemex-oficinas-corporativas-madrid": "cemex",
  "anhui-conch-cement-company-limited-cn": "conch",
  "heidelberg-materials-ag": "heidelberg",
  "commercial-metals-company": "cmc",
  "vulcan-materials-company": "vulcan",
  "zamil-steel-pre-engineered-buildings-co-ltd-sa": "zamil",
  "hangxiao-steel-structure-shandong-co-ltd-cn": "hangxiao",
  "chaoda-valves-group-co-ltd-cn": "chaoda",
  "neway-valve-suzhou-co-ltd-cn": "neway",
  "leo-group-pump-zhejiang-co-ltd-cn": "leo",
  "nanfang-pump-industry-co-ltd-cn": "nanfang",
  "zhejiang-zhiju-pipeline-industry-co-ltd-cn": "zhiju",
  "wafangdian-bearing-group-corp-ltd-cn": "wafangdian",
};

/** White-on-dark reverse logos that need a dark avatar chip. */
export const DARK_CHIP_LOGO_IDS = new Set<string>([
  "al-gharbia-pipe-company-llc-ae",
]);

export function localLogoPathForSupplierId(id: string): string | undefined {
  const slug = LOGO_SLUG_BY_ID[id];
  if (!slug) return undefined;
  return `/images/suppliers/logos/logo-${slug}.png`;
}

export function logoNeedsDarkChip(id: string): boolean {
  return DARK_CHIP_LOGO_IDS.has(id);
}
