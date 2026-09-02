/**
 * Local logo assets under `public/images/suppliers/logos/logo-{slug}.png`.
 * Prefer these over remote CSV `logoUrl` banners whenever a file exists.
 *
 * Complete phase-1 pack: 58 wordmarks (Magicrete skipped — no usable mark).
 * Later drops: add `logo-{slug}.png` and one `supplierId → slug` line below.
 * White-on-dark reverse marks also go in DARK_CHIP_LOGO_IDS.
 */

/** Explicit id → filename slug for the curated logo pack. */
export const LOGO_SLUG_BY_ID: Record<string, string> = {
  // Tubes & pipes / steel
  "al-gharbia-pipe-company-llc-ae": "al-gharbia",
  "aj-steel-icad2-ae": "aj-steel",
  "jindal-saw-limited-in": "jindal-saw",
  "welspun-corp-limited-in": "welspun",
  "arabian-pipes-company-sa": "arabian-pipes",
  "apl-apollo-tubes-limited-in": "apl-apollo",
  "man-industries-india-limited-in": "man-industries",
  "hebei-huayang-steel-pipe-co-ltd-cn": "huayang",
  "al-jazeera-steel-products-co-saog-om": "al-jazeera",
  "ratnamani-metals-tubes-limited-in": "ratnamani",
  "emsteel-building-materials-pjsc-emsteel-ae": "emsteel",
  "ferrite-structural-steels-pvt-ltd-panvel": "ferrite",
  "qatar-steel-company-q-p-s-c-qa": "qatar-steel",
  "jsw-steel-limited-in": "jsw",
  "saudi-iron-and-steel-company-hadeed-sa": "hadeed",
  "tata-steel-limited-in": "tata-steel",
  "jingye-steel-jingye-group-cn": "jingye",
  "ispat-alloys-tube-industries-mumbai": "vizag",
  "jindal-steel-limited-formerly-jindal-steel-power-l-in": "jindal-steel",
  "ezz-steel-eg": "ezz-steel",

  // Cables & electrical
  "foliflex-wires-cables-delhi": "foliflex",
  "kei-industries-limited-in": "kei",
  "tegh-cables-india-pvt-ltd-polycab-cables-wires-distributor-m": "polycab",
  "sudkabel-gmbh-kabelsysteme-kabel-und-kabelgarnituren-mannhei": "rr-kabel",
  "jiangsu-yuhui-cable-co-ltd-cn": "yuhui",
  "shanghai-shenghua-cable-group-co-ltd-cn": "shenghua",
  "xwa-power-cable-co-ltd-cn": "xwa",
  "henan-huadong-cable-co-ltd-cn": "huadong",
  "shandong-new-luxing-cable-co-ltd-cn": "luxing",
  "people-s-cable-group-co-ltd-cn": "peoples-cable",

  // Construction
  "ultratech-cement-limited-in": "ultratech",
  "cemex-oficinas-corporativas-madrid": "cemex",
  "anhui-conch-cement-company-limited-cn": "conch",
  "heidelberg-materials-ag": "heidelberg",
  "commercial-metals-company": "cmc",
  "vulcan-materials-company": "vulcan",
  "zamil-steel-pre-engineered-buildings-co-ltd-sa": "zamil",
  // Magicrete skipped — no usable wordmark in the pack
  "hangxiao-steel-structure-shandong-co-ltd-cn": "hangxiao",

  // Industrial parts
  "chaoda-valves-group-co-ltd-cn": "chaoda",
  "neway-valve-suzhou-co-ltd-cn": "neway",
  "leo-group-pump-zhejiang-co-ltd-cn": "leo",
  "nanfang-pump-industry-co-ltd-cn": "nanfang",
  "zhejiang-zhiju-pipeline-industry-co-ltd-cn": "zhiju",
  "wafangdian-bearing-group-corp-ltd-cn": "wafangdian",
  "luoyang-huigong-bearing-technology-co-ltd-cn": "huigong",
  "tong-ming-enterprise-zhejiang-co-ltd-cn": "tong-ming",
  "sundram-fasteners-limited-in": "sundram",
  "kirloskar-brothers-limited-in": "kirloskar",

  // Packaging
  "shandong-corruone-new-material-co-ltd-cn": "corruone",
  "dongguan-yalan-packing-materials-co-ltd-cn": "yalan",
  "jiangsu-jieyuan-container-co-ltd-cn": "jieyuan",
  "hangzhou-hansin-new-packing-material-co-ltd-cn": "hansin",
  "dongguan-caicheng-printing-factory-cn": "caicheng",
  "wuxi-sifang-youxin-co-ltd-cn": "sifang",
  "meghdoot-packaging-uttaranchal-in": "meghdoot",
  "shangyue-shanghai-printing-co-ltd-cn": "shangyue",
  "uflex-limited-in": "uflex",
  "shandong-dingsheng-container-co-ltd-cn": "dingsheng",
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
