import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { listScrapedProducts } from "@/lib/scraped-products-store";
import { COMMISSION_RATE } from "@/config/commerce";
import AdminProductsClient from "./AdminProductsClient";

export const metadata: Metadata = {
  title: "Product review · Admin | Suplymate",
  robots: { index: false, follow: false },
};

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
