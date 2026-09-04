import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { isSupplierRole } from "@/lib/roles";
import { getOwnedSupplier, type OwnedSupplierProfile } from "@/lib/supplier-owner";
import SwitchRoleCard from "@/components/supplier/SwitchRoleCard";
import {
  Building2,
  Package,
  FileText,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Clock,
  BadgeCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function completeness(p: OwnedSupplierProfile): number {
  const checks = [
    p.name,
    p.description.length > 60,
    p.logoUrl,
    p.country || p.location,
    p.website,
    p.email || p.phone,
    p.industriesServed.length > 0,
    p.materials.length > 0 || p.products.length > 0,
    p.moq,
    p.pricingNotes,
    p.leadTime,
    p.certifications.length > 0,
    p.images.length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export default async function SupplierOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const t = await getTranslations("supplierDashboard");

  const userId = session.user.id;
  const admin = isAdminEmail(session.user.email);
  const dbUser = await safe(
    () => prisma.user.findUnique({ where: { id: userId }, select: { role: true, firstName: true, name: true } }),
    null,
  );
  const profile = await getOwnedSupplier(userId);

  const supplierRole = isSupplierRole(dbUser?.role ?? session.user.role);
  if (!supplierRole && !profile && !admin) {
    return <SwitchRoleCard target="supplier" />;
  }

  const firstName = dbUser?.firstName || (dbUser?.name ?? session.user.name ?? "").split(" ")[0] || "there";

  if (!profile) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {t("welcome", { name: firstName })}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t("welcomeSubtitle")}</p>
        </header>
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan/10 blur-3xl"
          />
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white">
            <Building2 className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="mt-5 font-display text-xl font-bold text-ink">{t("noProfileTitle")}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">{t("noProfileBody")}</p>
          <Link href="/supplier-dashboard/profile" className="btn-primary mt-6">
            {t("createProfile")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      </div>
    );
  }

  const [openRfqs, conversations, catalogue] = await Promise.all([
    safe(() => prisma.rfq.count({ where: { supplierId: profile.id, status: { in: ["open", "submitted"] } } }), 0),
    safe(() => prisma.conversation.count({ where: { supplierId: profile.id } }), 0),
    safe(() => prisma.scrapedProduct.count({ where: { supplierId: profile.id } }), 0),
  ]);
  const pct = completeness(profile);

  const stats = [
    { label: t("profileCompleteness"), value: `${pct}%`, icon: Building2, href: "/supplier-dashboard/profile" },
    { label: t("openRfqs"), value: String(openRfqs), icon: FileText, href: "/supplier-dashboard/rfqs" },
    { label: t("activeConversations"), value: String(conversations), icon: MessageSquare, href: "/messages" },
    { label: t("catalogueItems"), value: String(catalogue), icon: Package, href: "/supplier-dashboard/products" },
    {
      label: t("trustScore"),
      value: profile.trustScore != null ? `${profile.trustScore}/100` : "—",
      icon: ShieldCheck,
      href: "/supplier-dashboard/profile",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {t("welcome", { name: firstName })}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t("welcomeSubtitle")}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            profile.verified
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {profile.verified ? <BadgeCheck className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {profile.verified ? t("statusVerified") : t("statusPending")}
        </span>
      </header>

      {!profile.verified && (
        <p className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {t("statusPendingHint")}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-cyan/40 hover:shadow-cardHover"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-soft text-cyan">
              <s.icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <p className="mt-4 font-display text-2xl font-bold tabular-nums text-ink">{s.value}</p>
            <p className="mt-1 text-xs font-medium text-ink-muted">{s.label}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">{t("profileCompleteness")}</h2>
          <span className="text-sm font-semibold tabular-nums text-ink">{pct}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan to-cyan-glow transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/supplier-dashboard/profile", label: t("editProfile"), icon: Building2 },
            { href: "/supplier-dashboard/products", label: t("addProduct"), icon: Package },
            { href: "/supplier-dashboard/rfqs", label: t("answerRfqs"), icon: FileText },
            { href: "/messages", label: t("openMessages"), icon: MessageSquare },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-ink transition hover:border-cyan/40 hover:bg-cyan-soft/60"
            >
              <a.icon className="h-4 w-4 text-cyan" aria-hidden />
              {a.label}
              <ArrowRight className="ml-auto h-4 w-4 text-ink-dim" aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
