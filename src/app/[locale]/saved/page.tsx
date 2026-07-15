import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localeRedirect } from "@/i18n/redirect";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Bookmark } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "products" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("pageTitle") }),
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

export default async function SavedProductsPage() {
  const session = await auth();
  if (!session?.user?.id) return await localeRedirect("/login?callbackUrl=/saved");
  const t = await getTranslations("products");
  const common = await getTranslations("common");
  const empty = await getTranslations("emptyStates");

  const items = await prisma.savedItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Bookmark className="h-6 w-6 text-cyan" aria-hidden />
        {t("pageTitle")}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{t("pageSubtitle")}</p>

      {items.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-ink-muted">
          {empty("noProducts")}{" "}
          <Link href="/products" className="text-cyan hover:underline">
            {t("pageTitle")}
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
                    {common("priceFrom", {
                      price: `${i.currency ?? "USD"} ${i.basePrice.toLocaleString()}`,
                      unit: i.unit ?? "",
                    })}
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
