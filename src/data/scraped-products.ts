import type { ProductCategory, ProductStatus } from "@/data/products";

// A product collected by the supplier-website scraper. Everything starts as
// `pending` and is only published to the public catalogue once an admin sets it
// to `approved`. Media fields may be empty — the UI always falls back to a clean
// placeholder, never a broken image.
export type ScrapedProduct = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierLogo?: string | null;
  name: string;
  category: ProductCategory;
  images: string[];
  videos: string[];
  /** Supplier base (wholesale) price before commission. */
  basePrice?: number | null;
  /** Per-product commission override; null = use global COMMISSION_RATE. */
  commissionRate?: number | null;
  currency: string;
  moq?: string | null;
  shippingTime?: string | null;
  description?: string | null;
  specifications: Record<string, string>;
  customizationOptions: string[];
  certifications: string[];
  rating?: number | null;
  reviewCount?: number | null;
  /** Public source page the product was collected from (for review/attribution). */
  sourceUrl: string;
  verifiedSupplier: boolean;
  status: ProductStatus;
  scrapedAt: string;
};

// Committed demo dataset so the admin review queue is populated and fully
// browsable WITHOUT a database (mirrors how the rest of the site degrades
// gracefully). The real scraper writes equivalent records to its cache and the
// import script upserts them into the DB.
export const sampleScrapedProducts: ScrapedProduct[] = [
  {
    id: "scraped-galv-steel-sheet",
    supplierId: "rotterdam-steel-works",
    supplierName: "Rotterdam Steel Works",
    supplierLogo: null,
    name: "Galvanized Steel Sheet DX51D Z275",
    category: "Steel & Metals",
    images: [],
    videos: [],
    basePrice: 0.82,
    commissionRate: null,
    currency: "USD",
    moq: "5 tons",
    shippingTime: "15–25 days",
    description:
      "Hot-dip galvanized steel sheet, DX51D grade with Z275 zinc coating. Suitable for roofing, ducting and general fabrication. Mill test certificates supplied.",
    specifications: {
      Material: "DX51D galvanized steel",
      "Zinc Coating": "Z275 (275 g/m²)",
      Thickness: "0.3–3.0 mm",
      Width: "1000 / 1250 mm",
      Standard: "EN 10346",
      "Place of Origin": "Netherlands",
    },
    customizationOptions: ["Custom width slitting", "Cut-to-length", "Custom coating weight"],
    certifications: ["ISO 9001", "CE", "EN 10346"],
    rating: 4.6,
    reviewCount: 84,
    sourceUrl: "https://example-supplier.com/products/galvanized-steel-sheet",
    verifiedSupplier: false,
    status: "pending",
    scrapedAt: "2026-06-15T10:00:00.000Z",
  },
  {
    id: "scraped-xlpe-power-cable",
    supplierId: "dammam-electric-industries",
    supplierName: "Dammam Electric Industries",
    supplierLogo: null,
    name: "XLPE Insulated Power Cable 4-core 16mm²",
    category: "Cables & Electrical",
    images: [],
    videos: [],
    basePrice: 6.4,
    commissionRate: null,
    currency: "USD",
    moq: "500 meters",
    shippingTime: "10–18 days",
    description:
      "Low-voltage XLPE insulated, PVC sheathed power cable. Copper conductor, 4-core 16mm². For fixed industrial and building installations.",
    specifications: {
      Conductor: "Electrolytic copper",
      Insulation: "XLPE",
      Cores: "4 x 16mm²",
      Voltage: "0.6/1 kV",
      Standard: "IEC 60502-1",
      "Place of Origin": "Saudi Arabia",
    },
    customizationOptions: ["Custom drum lengths", "Printed marking", "Armored variant"],
    certifications: ["ISO 9001", "IEC 60502", "RoHS"],
    rating: 4.4,
    reviewCount: 51,
    sourceUrl: "https://example-supplier.com/products/xlpe-power-cable",
    verifiedSupplier: false,
    status: "pending",
    scrapedAt: "2026-06-15T10:05:00.000Z",
  },
  {
    id: "scraped-seamless-steel-pipe",
    supplierId: "casablanca-tube-pipe-co",
    supplierName: "Casablanca Tube & Pipe Co.",
    supplierLogo: null,
    name: "Seamless Carbon Steel Pipe ASTM A106 Gr.B",
    category: "Tubes & Pipes",
    images: [],
    videos: [],
    basePrice: 24,
    commissionRate: null,
    currency: "USD",
    moq: "2 tons",
    shippingTime: "20–30 days",
    description:
      "Seamless carbon steel pipe, ASTM A106 Grade B, for high-temperature service. Beveled ends, varnish coated. Third-party inspection available.",
    specifications: {
      Material: "Carbon steel A106 Gr.B",
      "Outer Diameter": "21.3–610 mm",
      "Wall Thickness": "Sch 40 / Sch 80",
      Length: "6 m / 12 m",
      Standard: "ASTM A106",
      "Place of Origin": "Morocco",
    },
    customizationOptions: ["Custom lengths", "Galvanizing", "Threaded ends"],
    certifications: ["ISO 9001", "API 5L", "ASTM A106"],
    rating: 4.7,
    reviewCount: 122,
    sourceUrl: "https://example-supplier.com/products/seamless-steel-pipe",
    verifiedSupplier: false,
    status: "pending",
    scrapedAt: "2026-06-15T10:10:00.000Z",
  },
  {
    id: "scraped-corrugated-boxes",
    supplierId: "onlinepack-kartons-kartonagen-pulheim",
    supplierName: "OnlinePack Kartons",
    supplierLogo: null,
    name: "Corrugated Shipping Boxes (E-flute, Custom Print)",
    category: "Packaging",
    images: [],
    videos: [],
    basePrice: 0.34,
    commissionRate: null,
    currency: "USD",
    moq: "1000 pcs",
    shippingTime: "7–14 days",
    description:
      "Double-wall corrugated boxes with custom flexo printing. FSC-certified kraft, recyclable. Ideal for e-commerce and export packaging.",
    specifications: {
      Material: "Corrugated kraft (E-flute)",
      "Board Type": "Double wall",
      Printing: "Up to 4-color flexo",
      "Custom Size": "Yes",
      Standard: "FSC, ISO 9001",
      "Place of Origin": "Germany",
    },
    customizationOptions: ["Custom dimensions", "Branded print", "Die-cut inserts"],
    certifications: ["FSC", "ISO 9001"],
    rating: 4.5,
    reviewCount: 67,
    sourceUrl: "https://example-supplier.com/products/corrugated-boxes",
    verifiedSupplier: false,
    status: "pending",
    scrapedAt: "2026-06-15T10:15:00.000Z",
  },
  {
    id: "scraped-portland-cement",
    supplierId: "duboxx-packaging-llc-ae",
    supplierName: "Gulf Construction Materials",
    supplierLogo: null,
    name: "Portland Cement CEM I 42.5N (Bulk / Bagged)",
    category: "Construction",
    images: [],
    videos: [],
    basePrice: 88,
    commissionRate: null,
    currency: "USD",
    moq: "25 tons",
    shippingTime: "5–12 days",
    description:
      "Ordinary Portland cement CEM I 42.5N for structural concrete. Available bulk or in 50kg bags. Conforms to EN 197-1.",
    specifications: {
      Type: "CEM I 42.5N",
      "Compressive Strength": "≥ 42.5 MPa (28d)",
      Packaging: "50kg bags / bulk",
      Standard: "EN 197-1",
      "Place of Origin": "United Arab Emirates",
    },
    customizationOptions: ["Bulk tanker", "Branded bags", "Sulphate-resistant grade"],
    certifications: ["EN 197-1", "ISO 9001"],
    rating: 4.3,
    reviewCount: 39,
    sourceUrl: "https://example-supplier.com/products/portland-cement",
    verifiedSupplier: false,
    status: "pending",
    scrapedAt: "2026-06-15T10:20:00.000Z",
  },
  {
    id: "scraped-hydraulic-cylinder",
    supplierId: "landefeld-druckluft-und-hydraulik-kassel",
    supplierName: "Landefeld Hydraulik",
    supplierLogo: null,
    name: "Double-Acting Hydraulic Cylinder 80mm Bore",
    category: "Industrial Parts",
    images: [],
    videos: [],
    basePrice: 410,
    commissionRate: null,
    currency: "USD",
    moq: "10 units",
    shippingTime: "18–28 days",
    description:
      "Double-acting welded hydraulic cylinder, 80mm bore, chrome-plated rod. Customizable stroke and mounting. Tested to 250 bar.",
    specifications: {
      Bore: "80 mm",
      "Rod Diameter": "45 mm",
      "Max Pressure": "250 bar",
      Mounting: "Clevis / flange",
      Standard: "ISO 6020/2",
      "Place of Origin": "Germany",
    },
    customizationOptions: ["Custom stroke", "Mounting type", "Position sensor"],
    certifications: ["ISO 9001", "CE"],
    rating: 4.6,
    reviewCount: 28,
    sourceUrl: "https://example-supplier.com/products/hydraulic-cylinder",
    verifiedSupplier: false,
    status: "pending",
    scrapedAt: "2026-06-15T10:25:00.000Z",
  },
];
