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
    image: "/images/suppliers/band/al-gharbia-pipe.jpg",
    imageWidth: 1400,
    imageHeight: 881,
    supplierId: "al-gharbia-pipe-company-llc-ae",
    fallbackHref: "/suppliers",
  },
  {
    key: "emsteel",
    image: "/images/suppliers/band/emsteel-abu-dhabi.jpg",
    imageWidth: 1600,
    imageHeight: 900,
    fallbackHref: "/suppliers",
  },
  {
    key: "ferrite",
    image: "/images/suppliers/band/ferrite-structural.jpg",
    imageWidth: 1600,
    imageHeight: 831,
    supplierId: "ferrite-structural-steels-pvt-ltd-panvel",
    fallbackHref: "/suppliers",
  },
  {
    key: "foliflex",
    image: "/images/suppliers/band/foliflex-cables.jpg",
    imageWidth: 1400,
    imageHeight: 1050,
    supplierId: "foliflex-wires-cables-delhi",
    fallbackHref: "/suppliers",
  },
];

export function getSupplierBandHref(entry: HomeSupplierBandEntry): string {
  return entry.supplierId ? `/supplier/${entry.supplierId}` : entry.fallbackHref;
}
