import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { listAdminSuppliers } from "@/lib/suppliers-store";
import { listCertifications } from "@/lib/certifications-store";
import AdminCertificationsClient from "./AdminCertificationsClient";

export const metadata: Metadata = {
  title: "Certifications · Admin | Suplymate",
  robots: { index: false, follow: false },
};

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
