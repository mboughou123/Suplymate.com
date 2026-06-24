import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addItem, clearCart, getCart } from "@/lib/cart-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cart = await getCart(session.user.id);
  return NextResponse.json({ cart });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (!body?.supplierId || !body?.productName) {
      return NextResponse.json({ error: "supplierId and productName are required" }, { status: 400 });
    }
    const cart = await addItem(session.user.id, {
      productId: body.productId ?? null,
      productName: String(body.productName),
      supplierId: String(body.supplierId),
      supplierName: String(body.supplierName ?? "Supplier"),
      imageUrl: body.imageUrl ?? null,
      unit: body.unit ?? null,
      quantity: body.quantity != null ? Number(body.quantity) : null,
      moq: body.moq != null ? Number(body.moq) : null,
      basePrice: body.basePrice != null ? Number(body.basePrice) : null,
      currency: body.currency ?? null,
      note: body.note ?? null,
      sourceUrl: body.sourceUrl ?? null,
    });
    return NextResponse.json({ cart });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to add item" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cart = await clearCart(session.user.id);
  return NextResponse.json({ cart });
}
