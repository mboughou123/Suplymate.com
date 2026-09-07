/**
 * Homepage “suppliers around the world” band — four Amine-approved mills.
 * Photos live in `public/images/suppliers/band/`.
 */
export type HomeSupplierBandKey = "alGharbia" | "emsteel" | "ferrite" | "foliflex";

export type HomeSupplierBandEntry = {
  key: HomeSupplierBandKey;
  image: string;
  imageWidth: number;
  imageHeight: number;
  /** When set, card links to the verified supplier profile. */
  supplierId?: string;
  /** Fallback when the mill is not yet in the directory. */
  fallbackHref: "/suppliers";
};

export const HOME_SUPPLIERS_BAND: HomeSupplierBandEntry[] = [
  {
    key: "alGharbia",
    image: "/images/suppliers/band/01-al-gharbia.jpg",
    imageWidth: 1600,
    imageHeight: 812,
    supplierId: "al-gharbia-pipe-company-llc-ae",
    fallbackHref: "/suppliers",
  },
  {
    key: "emsteel",
    image: "/images/suppliers/band/02-emsteel.jpg",
    imageWidth: 1920,
    imageHeight: 628,
    supplierId: "emsteel-building-materials-pjsc-emsteel-ae",
    fallbackHref: "/suppliers",
  },
  {
    key: "ferrite",
    image: "/images/suppliers/band/03-ferrite.jpg",
    imageWidth: 1688,
    imageHeight: 877,
    supplierId: "ferrite-structural-steels-pvt-ltd-panvel",
    fallbackHref: "/suppliers",
  },
  {
    key: "foliflex",
    image: "/images/suppliers/band/04-foliflex.jpg",
    imageWidth: 1920,
    imageHeight: 600,
    supplierId: "foliflex-wires-cables-delhi",
    fallbackHref: "/suppliers",
  },
];

export function getSupplierBandHref(entry: HomeSupplierBandEntry): string {
  return entry.supplierId ? `/supplier/${entry.supplierId}` : entry.fallbackHref;
}
