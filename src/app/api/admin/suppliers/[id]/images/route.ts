import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin";
import { addProductImages, addCertificationImages } from "@/lib/suppliers-store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function urls(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(String).map((s) => s.trim()).filter(Boolean);
}

// POST /api/admin/suppliers/:id/images
// Body: { productImages?: string[], certificationImages?: string[] }
// Append manually-curated product/supplier and certification image URLs.
export async function POST(request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    productImages?: unknown;
    certificationImages?: unknown;
  };

  const productImages = urls(body.productImages);
  const certificationImages = urls(body.certificationImages);

  if (productImages.length === 0 && certificationImages.length === 0) {
    return NextResponse.json(
      { error: "Provide productImages and/or certificationImages." },
      { status: 400 }
    );
  }

  let supplier = null;
  if (productImages.length) supplier = await addProductImages(id, productImages);
  if (certificationImages.length) supplier = await addCertificationImages(id, certificationImages);

  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ supplier });
}
