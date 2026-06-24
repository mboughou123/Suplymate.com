import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { checkAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  ShieldCheck,
  FileText,
  Building2,
  Image as ImageIcon,
  Award,
  Package,
  Database,
  MessageSquare,
  Star,
  Flag,
  CreditCard,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admin | Suplymate",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function safeCount(fn: () => Promise<number>): Promise<number | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export default async function AdminHomePage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin");
  if (!ok) redirect("/");

  const [pendingClaims, openRfqs, pendingReviews, openReports, pendingProducts] = await Promise.all([
    safeCount(() => prisma.supplierClaim.count({ where: { status: "SUBMITTED" } })),
    safeCount(() => prisma.rfq.count()),
    safeCount(() => prisma.review.count({ where: { status: "PENDING" } })),
    safeCount(() => prisma.report.count({ where: { status: "OPEN" } })),
    safeCount(() => prisma.scrapedProduct.count({ where: { status: "pending" } })),
  ]);

  const sections: {
    href: string;
    label: string;
    desc: string;
    icon: typeof ShieldCheck;
    badge?: number | null;
  }[] = [
    { href: "/admin/data-quality", label: "Data quality", desc: "Verification, provenance, completeness", icon: Database },
    { href: "/admin/supplier-claims", label: "Supplier claims", desc: "Review profile claims", icon: ShieldCheck, badge: pendingClaims },
    { href: "/admin/rfqs", label: "RFQs & quotes", desc: "Oversee requests and quotes", icon: FileText, badge: openRfqs },
    { href: "/admin/reviews", label: "Reviews", desc: "Moderate supplier reviews", icon: Star, badge: pendingReviews },
    { href: "/admin/reports", label: "Reports", desc: "Abuse & content reports", icon: Flag, badge: openReports },
    { href: "/admin/suppliers", label: "Suppliers", desc: "Directory & verification", icon: Building2 },
    { href: "/admin/products", label: "Products", desc: "Catalogue moderation", icon: Package, badge: pendingProducts },
    { href: "/admin/certifications", label: "Certifications", desc: "Certificate review", icon: Award },
    { href: "/admin/media", label: "Media library", desc: "Images & assets", icon: ImageIcon },
    { href: "/admin/import-suppliers", label: "Import suppliers", desc: "Scrape & import", icon: Users },
    { href: "/admin/subscriptions", label: "Subscriptions", desc: "Plans & billing status", icon: CreditCard },
    { href: "/messages", label: "Messages", desc: "Conversations", icon: MessageSquare },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Admin</h1>
      <p className="mt-1 text-sm text-ink-muted">Operations, moderation, and data quality.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group relative rounded-2xl border border-slate-200 p-5 transition hover:border-cyan/40 hover:shadow-sm"
          >
            <s.icon className="h-6 w-6 text-cyan" aria-hidden />
            <p className="mt-3 font-semibold text-ink group-hover:text-cyan">{s.label}</p>
            <p className="mt-0.5 text-xs text-ink-dim">{s.desc}</p>
            {s.badge != null && s.badge > 0 && (
              <span className="absolute right-4 top-4 rounded-full bg-cyan px-2 py-0.5 text-xs font-bold text-white">
                {s.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
