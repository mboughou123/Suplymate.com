import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin";
import {
  updateScrapedProduct,
  type ScrapedPatch,
} from "@/lib/scraped-products-store";

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
  if (typeof body.description === "string") patch.description = body.description;
  if ("basePrice" in body) {
    const n = toNumberOrNull(body.basePrice);
    if (n !== undefined) patch.basePrice = n;
  }
  if ("commissionRate" in body) {
    const n = toNumberOrNull(body.commissionRate);
    if (n !== undefined) patch.commissionRate = n;
  }
  if (typeof body.moq === "string") patch.moq = body.moq;
  if (typeof body.shippingTime === "string") patch.shippingTime = body.shippingTime;
  if (Array.isArray(body.images)) patch.images = body.images.map(String).filter(Boolean);
  if (Array.isArray(body.videos)) patch.videos = body.videos.map(String).filter(Boolean);
  if ("supplierLogo" in body) {
    patch.supplierLogo = body.supplierLogo ? String(body.supplierLogo) : null;
  }
  if (typeof body.verifiedSupplier === "boolean") {
    patch.verifiedSupplier = body.verifiedSupplier;
  }
  if (
    body.status === "pending" ||
    body.status === "approved" ||
    body.status === "rejected"
  ) {
    patch.status = body.status;
  }

  const updated = await updateScrapedProduct(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product: updated });
}
