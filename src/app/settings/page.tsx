import Link from "next/link";
import { redirect } from "next/navigation";
import { User, ShieldCheck, CreditCard, SlidersHorizontal } from "lucide-react";
import { getCurrentAccount } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { getBillingState } from "@/lib/billing";

export default async function SettingsOverviewPage() {
  const { authenticated, user } = await getCurrentAccount();
  if (!authenticated || !user) redirect("/login?callbackUrl=/settings");

  const isAdmin = isAdminEmail(user.email);
  const billing = getBillingState(user);
  const displayName = user.name || [user.firstName, user.lastName].filter(Boolean).join(" ");

  const rows: { label: string; value: string }[] = [
    { label: "Name", value: displayName || "—" },
    { label: "Email", value: user.email },
    { label: "Role", value: isAdmin ? "Administrator" : "Member" },
    { label: "Current plan", value: billing.plan.name },
    {
      label: "Account status",
      value: billing.status.charAt(0).toUpperCase() + billing.status.slice(1),
    },
  ];

  const links = [
    {
      href: "/settings/account",
      title: "Account information",
      desc: "Update your name, company, and contact details.",
      icon: User,
    },
    {
      href: "/settings/security",
      title: "Security",
      desc: "Change your password or delete your account.",
      icon: ShieldCheck,
    },
    {
      href: "/settings/subscription",
      title: "Subscription & billing",
      desc: "View your plan and available upgrades.",
      icon: CreditCard,
    },
    {
      href: "/settings/preferences",
      title: "Preferences",
      desc: "Manage notifications and language.",
      icon: SlidersHorizontal,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-bold text-ink">Account summary</h2>
        <dl className="mt-4 divide-y divide-slate-100">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-2.5"
            >
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
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-gold/40 hover:shadow-card"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <link.icon className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-ink">{link.title}</h3>
            <p className="mt-1 text-xs text-ink-muted">{link.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
