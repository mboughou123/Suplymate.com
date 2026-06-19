import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin";
import {
  getAdminSupplier,
  updateSupplier,
  deleteSupplier,
  type SupplierPatch,
  type CertificationDetail,
} from "@/lib/suppliers-store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function toStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.map(String).map((s) => s.trim()).filter(Boolean);
}

// GET /api/admin/suppliers/:id
export async function GET(_request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;

  const { id } = await params;
  const supplier = await getAdminSupplier(id);
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ supplier });
}

// PATCH /api/admin/suppliers/:id — edit supplier info (any subset of fields).
export async function PATCH(request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: SupplierPatch = {};

  const strFields: (keyof SupplierPatch)[] = [
    "name", "industry", "category", "location", "country", "city", "address",
    "website", "phone", "email", "description", "logoUrl", "imageUrl", "moq", "sourceUrl",
  ];
  for (const f of strFields) {
    if (f in body) {
      const v = body[f];
      (patch as Record<string, unknown>)[f] = v === null || v === "" ? null : String(v);
    }
  }

  const images = toStringArray(body.images);
  if (images) patch.images = images;
  const certImages = toStringArray(body.certificationImages);
  if (certImages) patch.certificationImages = certImages;
  const products = toStringArray(body.products);
  if (products) patch.products = products;
  const regions = toStringArray(body.deliveryRegions);
  if (regions) patch.deliveryRegions = regions;

  if (Array.isArray(body.certifications)) {
    patch.certifications = (body.certifications as unknown[])
      .map((c): CertificationDetail | null => {
        if (c && typeof c === "object" && typeof (c as { name?: unknown }).name === "string") {
          const obj = c as Record<string, unknown>;
          return {
            name: String(obj.name),
            type: obj.type ? String(obj.type) : null,
            imageUrl: obj.imageUrl ? String(obj.imageUrl) : null,
            certificateUrl: obj.certificateUrl ? String(obj.certificateUrl) : null,
            sourceUrl: obj.sourceUrl ? String(obj.sourceUrl) : null,
          };
        }
        return null;
      })
      .filter((c): c is CertificationDetail => !!c);
  }

  if ("rating" in body) {
    const n = Number(body.rating);
    patch.rating = Number.isFinite(n) ? n : null;
  }
  if ("reviewCount" in body) {
    const n = parseInt(String(body.reviewCount).replace(/[^\d]/g, ""), 10);
    patch.reviewCount = Number.isFinite(n) ? n : null;
  }
  if (
    body.verificationStatus === "pending" ||
    body.verificationStatus === "verified" ||
    body.verificationStatus === "rejected" ||
    body.verificationStatus === "needs_info"
  ) {
    patch.verificationStatus = body.verificationStatus;
  }

  const updated = await updateSupplier(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ supplier: updated });
}

// DELETE /api/admin/suppliers/:id — remove (e.g. a duplicate).
export async function DELETE(_request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;

  const { id } = await params;
  const ok = await deleteSupplier(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
