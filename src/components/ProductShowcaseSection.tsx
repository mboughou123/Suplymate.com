"use client";

import {
  Layers,
  Boxes,
  Hammer,
  Package,
  CircuitBoard,
  Cog,
  Shirt,
  Briefcase,
} from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import ProductShowcaseCard, {
  type ProductShowcaseCardProps,
} from "@/components/ProductShowcaseCard";

const TILE_GRADIENTS = [
  "linear-gradient(135deg, rgba(2,132,199,0.16), rgba(13,148,136,0.16))",
  "linear-gradient(135deg, rgba(13,51,73,0.14), rgba(2,132,199,0.2))",
  "linear-gradient(135deg, rgba(13,148,136,0.18), rgba(5,150,105,0.16))",
  "linear-gradient(135deg, rgba(203,163,81,0.16), rgba(2,132,199,0.14))",
];

const products: ProductShowcaseCardProps[] = [
  {
    name: "Steel",
    icon: Layers,
    tileGradient: TILE_GRADIENTS[0],
    priceRange: "$520 – $980 / ton",
    shippingTime: "Ships in 7–14 days",
    supplierCount: 240,
  },
  {
    name: "Aluminum",
    icon: Boxes,
    tileGradient: TILE_GRADIENTS[1],
    priceRange: "$2.1k – $2.8k / ton",
    shippingTime: "Ships in 10–18 days",
    supplierCount: 180,
  },
  {
    name: "Cement",
    icon: Hammer,
    tileGradient: TILE_GRADIENTS[2],
    priceRange: "$95 – $140 / ton",
    shippingTime: "Ships in 3–7 days",
    supplierCount: 160,
  },
  {
    name: "Packaging boxes",
    icon: Package,
    tileGradient: TILE_GRADIENTS[3],
    priceRange: "$0.18 – $0.60 / unit",
    shippingTime: "Ships in 5–12 days",
    supplierCount: 320,
  },
  {
    name: "Electrical components",
    icon: CircuitBoard,
    tileGradient: TILE_GRADIENTS[0],
    priceRange: "$1.20 – $45 / unit",
    shippingTime: "Ships in 6–15 days",
    supplierCount: 410,
  },
  {
    name: "Machinery parts",
    icon: Cog,
    tileGradient: TILE_GRADIENTS[1],
    priceRange: "$80 – $9,500 / unit",
    shippingTime: "Ships in 12–25 days",
    supplierCount: 150,
  },
  {
    name: "Textiles",
    icon: Shirt,
    tileGradient: TILE_GRADIENTS[2],
    priceRange: "$1.80 – $12 / meter",
    shippingTime: "Ships in 8–16 days",
    supplierCount: 200,
  },
  {
    name: "Office supplies",
    icon: Briefcase,
    tileGradient: TILE_GRADIENTS[3],
    priceRange: "$0.50 – $250 / unit",
    shippingTime: "Ships in 3–9 days",
    supplierCount: 130,
  },
];

export default function ProductShowcaseSection() {
  return (
    <section className="relative overflow-hidden py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-4rem] top-10 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute left-[-4rem] bottom-10 h-72 w-72 rounded-full bg-cyan/10 blur-3xl" />
      </div>

      <div className="relative container-page">
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Products Businesses Can Source
          </h2>
          <p className="mt-3 text-ink-muted">
            From raw materials to finished goods — compare offers from vetted
            suppliers and buy at the right price.
          </p>
        </AnimatedSection>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, i) => (
            <AnimatedSection key={product.name} delay={(i % 4) * 0.08} from="up">
              <ProductShowcaseCard {...product} />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
