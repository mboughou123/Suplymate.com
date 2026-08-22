import { redirect } from "next/navigation";
import { checkAdmin } from "@/lib/admin";
import { listAdminSuppliers } from "@/lib/suppliers-store";
import { listCertifications } from "@/lib/certifications-store";
import AdminCertificationsClient from "./AdminCertificationsClient";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({ locale, pathname: "/admin/certifications", titleKey: "adminCertificationsTitle", descriptionKey: "adminDescription", robots: { index: false, follow: false } });
}

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ supplierId?: string }> };

export default async function AdminCertificationsPage({ searchParams }: Props) {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/certifications");
  if (!ok) redirect("/");

  const { supplierId } = await searchParams;
  const [suppliers, certifications] = await Promise.all([
    listAdminSuppliers(),
    listCertifications(supplierId),
  ]);

  return (
    <AdminCertificationsClient
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      initialCertifications={certifications}
      initialSupplierId={supplierId ?? ""}
    />
  );
}
