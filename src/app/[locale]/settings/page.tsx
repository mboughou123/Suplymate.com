import { Link } from "@/i18n/navigation";
import { localeRedirect } from "@/i18n/redirect";
import { getTranslations } from "next-intl/server";
import { User, Building2, CreditCard, Bell, ShieldCheck, Users, ArrowRight } from "lucide-react";
import { getCurrentAccount } from "@/lib/account";
import { getBillingState } from "@/lib/billing";
import { getIndustry } from "@/data/industries";

export default async function SettingsOverviewPage() {
  const { authenticated, user } = await getCurrentAccount();
  if (!authenticated || !user) return await localeRedirect("/login?callbackUrl=/settings");

  const t = await getTranslations("settings");
  const common = await getTranslations("common");
  const billing = getBillingState(user);
  const displayName = user.name || [user.firstName, user.lastName].filter(Boolean).join(" ");

  const rows: { label: string; value: string }[] = [
    { label: common("name"), value: displayName || "—" },
    { label: t("username"), value: user.username ? `@${user.username}` : "—" },
    { label: common("email"), value: user.email },
    { label: common("company"), value: user.company || "—" },
    { label: t("industry"), value: getIndustry(user.industry)?.name ?? user.industry ?? "—" },
    { label: t("accountType"), value: user.role === "supplier" ? t("roleSupplier") : t("roleBuyer") },
    { label: t("planLabel"), value: billing.plan.name },
  ];

  const links = [
    { href: "/settings/account", title: t("account"), desc: t("accountSubtitle"), icon: User },
    { href: "/settings/business", title: t("business"), desc: t("businessSubtitle"), icon: Building2 },
    { href: "/settings/subscription", title: t("subscription"), desc: t("subscriptionSubtitle"), icon: CreditCard },
    { href: "/settings/notifications", title: t("notifications"), desc: t("notificationsSubtitle"), icon: Bell },
    { href: "/settings/security", title: t("security"), desc: t("securitySubtitle"), icon: ShieldCheck },
    { href: "/settings/team", title: t("team"), desc: t("teamSubtitle"), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-bold text-ink">{t("overview")}</h2>
        <p className="mt-1 text-xs text-ink-muted">{t("overviewSubtitle")}</p>
        <dl className="mt-4 divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-sm text-ink-muted">{row.label}</dt>
              <dd className="truncate text-sm font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-cyan/40 hover:shadow-cardHover"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-soft text-cyan">
              <link.icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{link.title}</span>
                <ArrowRight className="h-4 w-4 text-ink-dim transition group-hover:translate-x-0.5 group-hover:text-cyan" aria-hidden />
              </span>
              <span className="mt-1 block text-xs text-ink-muted">{link.desc}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
