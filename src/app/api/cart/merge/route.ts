import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mergeGuestItems, type CartItemInput } from "@/lib/cart-store";

export const dynamic = "force-dynamic";

// Merge guest (localStorage) cart items into the authenticated user's cart.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? (body.items as CartItemInput[]) : [];
    const cart = await mergeGuestItems(session.user.id, items);
    return NextResponse.json({ cart });
  } catch {
    return NextResponse.json({ error: "Failed to merge cart" }, { status: 400 });
  }
}
