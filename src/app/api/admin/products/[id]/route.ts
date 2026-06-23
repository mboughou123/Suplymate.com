import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin";
import {
  updateScrapedProduct,
  deleteScrapedProduct,
  type ScrapedPatch,
} from "@/lib/scraped-products-store";
import { productCategories } from "@/data/products";

type Params = { params: Promise<{ id: string }> };

function toNumberOrNull(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function PATCH(request: Request, { params }: Params) {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: ScrapedPatch = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.category === "string" && (productCategories as string[]).includes(body.category)) {
    patch.category = body.category as ScrapedPatch["category"];
  }
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.shortDescription === "string") patch.shortDescription = body.shortDescription;
  if ("basePrice" in body) {
    const n = toNumberOrNull(body.basePrice);
    if (n !== undefined) patch.basePrice = n;
  }
  if ("commissionRate" in body) {
    const n = toNumberOrNull(body.commissionRate);
    if (n !== undefined) patch.commissionRate = n;
  }
  if (typeof body.priceUnit === "string") patch.priceUnit = body.priceUnit.trim() || null;
  if (typeof body.moq === "string") patch.moq = body.moq;
  if (typeof body.minimumOrderUnit === "string") patch.minimumOrderUnit = body.minimumOrderUnit.trim() || null;
  if (typeof body.shippingTime === "string") patch.shippingTime = body.shippingTime;
  if (Array.isArray(body.images)) patch.images = body.images.map(String).filter(Boolean);
  if (Array.isArray(body.videos)) patch.videos = body.videos.map(String).filter(Boolean);
  if ("productUrl" in body) {
    patch.productUrl = body.productUrl ? String(body.productUrl) : null;
  }
  if ("imageSourceUrl" in body) {
    patch.imageSourceUrl = body.imageSourceUrl ? String(body.imageSourceUrl) : null;
  }
  if ("supplierLogo" in body) {
    patch.supplierLogo = body.supplierLogo ? String(body.supplierLogo) : null;
  }
  if (typeof body.verifiedSupplier === "boolean") {
    patch.verifiedSupplier = body.verifiedSupplier;
  }
  if (
    body.status === "pending" ||
    body.status === "approved" ||
    body.status === "rejected" ||
    body.status === "needs_info"
  ) {
    patch.status = body.status;
  }

  const updated = await updateScrapedProduct(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const deleted = await deleteScrapedProduct(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
