import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedSupplier } from "@/lib/supplier-owner";
import { slugifySupplierId } from "@/lib/supplier-normalize";

export const dynamic = "force-dynamic";

// Supplier-managed catalogue. Products are stored in the same table as
// imported/scraped products so they flow through the existing moderation queue:
// new entries start "pending" and become public only after admin approval.

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function num(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function serialize(p: {
  id: string;
  name: string;
  category: string;
  images: string;
  basePrice: number | null;
  priceUnit: string | null;
  currency: string;
  moq: string | null;
  shippingTime: string | null;
  shortDescription: string | null;
  status: string;
  updatedAt: Date;
}) {
  let images: string[] = [];
  try {
    const parsed = JSON.parse(p.images);
    if (Array.isArray(parsed)) images = parsed.filter((x) => typeof x === "string");
  } catch {
    images = [];
  }
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    imageUrl: images[0] ?? null,
    basePrice: p.basePrice,
    priceUnit: p.priceUnit,
    currency: p.currency,
    moq: p.moq,
    shippingTime: p.shippingTime,
    shortDescription: p.shortDescription,
    status: p.status,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owned = await getOwnedSupplier(session.user.id);
  if (!owned) return NextResponse.json({ products: [], profile: null });
  try {
    const rows = await prisma.scrapedProduct.findMany({
      where: { supplierId: owned.id },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ products: rows.map(serialize), profile: { id: owned.id } });
  } catch {
    return NextResponse.json({ error: "Could not load your products." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owned = await getOwnedSupplier(session.user.id);
  if (!owned) {
    return NextResponse.json(
      { error: "Create your company profile before adding products." },
      { status: 400 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = str(body.name, 140);
  const category = str(body.category, 80) || "Industrial Parts";
  if (!name) return NextResponse.json({ error: "Product name is required." }, { status: 400 });

  const imageUrl = str(body.imageUrl, 500);
  const basePrice = num(body.basePrice);
  const slugBase = slugifySupplierId(name) || "product";
  const id = `${owned.id}-${slugBase}-${Date.now().toString(36)}`.slice(0, 120);

  try {
    const row = await prisma.scrapedProduct.create({
      data: {
        id,
        supplierId: owned.id,
        supplierName: owned.name,
        supplierLogo: owned.logoUrl || null,
        supplierCountry: owned.country || null,
        name,
        slug: slugBase,
        category,
        images: JSON.stringify(imageUrl && /^https?:\/\//i.test(imageUrl) ? [imageUrl] : []),
        basePrice,
        priceUnit: str(body.priceUnit, 40) || null,
        currency: str(body.currency, 8) || "USD",
        moq: str(body.moq, 80) || null,
        minimumOrderUnit: str(body.moqUnit, 40) || null,
        shippingTime: str(body.shippingTime, 80) || null,
        shortDescription: str(body.shortDescription, 400) || null,
        description: str(body.description, 4000) || null,
        sourceUrl: "supplier:portal",
        verifiedSupplier: owned.verified,
        status: "pending",
      },
    });
    return NextResponse.json({ ok: true, product: serialize(row) });
  } catch {
    return NextResponse.json({ error: "Could not save the product." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owned = await getOwnedSupplier(session.user.id);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  if (!owned || !id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const deleted = await prisma.scrapedProduct.deleteMany({ where: { id, supplierId: owned.id } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete the product." }, { status: 500 });
  }
}
