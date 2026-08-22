import { redirect } from "next/navigation";
import { checkAdmin } from "@/lib/admin";
import { listScrapedProducts } from "@/lib/scraped-products-store";
import { COMMISSION_RATE } from "@/config/commerce";
import AdminProductsClient from "./AdminProductsClient";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({ locale, pathname: "/admin/products", titleKey: "adminProductsTitle", descriptionKey: "adminDescription", robots: { index: false, follow: false } });
}

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/products");
  if (!ok) redirect("/");

  const products = await listScrapedProducts();

  return (
    <AdminProductsClient
      initialProducts={products}
      commissionRate={COMMISSION_RATE}
    />
  );
}
