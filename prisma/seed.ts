import { PrismaClient } from "@prisma/client";
import { verifiedSuppliers } from "../src/data/verified-suppliers";
import { outscraperSuppliers } from "../src/data/outscraper-suppliers";
import { phase1Suppliers } from "../src/data/phase1-suppliers";
import { products } from "../src/data/products";
import { materials } from "../src/data/materials";
import { hash } from "bcryptjs";
import type { Supplier } from "../src/data/suppliers";

const prisma = new PrismaClient();

function mergeById(...lists: Supplier[][]): Supplier[] {
  const byId = new Map<string, Supplier>();
  for (const list of lists) {
    for (const s of list) byId.set(s.id, s);
  }
  return [...byId.values()];
}

async function main() {
  await prisma.priceAlert.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.material.deleteMany();

  const base =
    outscraperSuppliers.length > 0 ? outscraperSuppliers : verifiedSuppliers;
  // Phase-1 overlays Outscraper for matching ids (richer factory photos).
  const seedSuppliers = mergeById(base, phase1Suppliers);

  for (const s of seedSuppliers) {
    await prisma.supplier.create({
      data: {
        id: s.id,
        name: s.name,
        industry: s.industry,
        category: s.category ?? null,
        location: s.location,
        country: s.country ?? null,
        city: s.city ?? null,
        website: s.website ?? null,
        phone: s.phone ?? null,
        email: s.email ?? null,
        imageUrl: s.imageUrl ?? null,
        logoUrl: s.logoUrl ?? null,
        images: JSON.stringify(s.supplierImages ?? []),
        googleRating: s.googleRating ?? null,
        googleReviews: s.googleReviews ?? null,
        description: s.description ?? null,
        products: JSON.stringify(s.products),
        deliveryRegions: JSON.stringify(s.deliveryRegions),
        moq: s.moq,
        verified: Boolean(s.verified),
        address: s.address ?? null,
        openingHours: s.openingHours ?? null,
        sourceUrl: s.sourceUrl ?? null,
        score: s.score ?? null,
        reliabilityScore: s.reliabilityScore,
      },
    });
  }

  for (const p of products) {
    await prisma.product.create({
      data: {
        id: p.id,
        name: p.name,
        category: p.category,
        priceMin: p.priceMin,
        priceMax: p.priceMax,
        currency: p.currency,
        bestDeliveryDays: p.bestDeliveryDays,
        supplierCount: p.supplierCount,
        unit: p.unit,
      },
    });
  }

  for (const m of materials) {
    await prisma.material.create({
      data: {
        id: m.id,
        name: m.name,
        symbol: m.symbol,
        currentPrice: m.currentPrice,
        unit: m.unit,
        currency: m.currency,
        dailyChange: m.dailyChange,
        monthlyChange: m.monthlyChange,
        yearlyChange: m.yearlyChange,
        signal: m.signal,
        history: JSON.stringify(m.history),
      },
    });
  }

  const demoEmail = "demo@suplymate.com";
  const existing = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: "Karim Alaoui",
        email: demoEmail,
        passwordHash: await hash("demo123", 12),
        company: "CasaSteel",
      },
    });
    console.log("Demo user: demo@suplymate.com / demo123");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
