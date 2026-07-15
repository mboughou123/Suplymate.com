import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Bookmark } from "lucide-react";

export const metadata: Metadata = {
  title: "Saved products | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SavedProductsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/saved");

  const items = await prisma.savedItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Bookmark className="h-6 w-6 text-cyan" aria-hidden />
        Saved products
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Products you saved for later. Prices are supplier-listed snapshots and may change.
      </p>

      {items.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-ink-muted">
          No saved products yet.{" "}
          <Link href="/products" className="text-cyan hover:underline">
            Browse products
          </Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((i) => (
            <li key={i.id} className="flex gap-3 rounded-xl border border-slate-200 p-4">
              {i.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${i.productId}`}
                  className="font-semibold text-ink hover:text-cyan"
                >
                  {i.productName}
                </Link>
                <p className="text-xs text-ink-dim">{i.supplierName}</p>
                {i.basePrice != null && (
                  <p className="mt-1 text-xs text-ink-muted">
                    {i.currency ?? "USD"} {i.basePrice.toLocaleString()}
                    {i.unit ? ` / ${i.unit}` : ""} · supplier-listed
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
