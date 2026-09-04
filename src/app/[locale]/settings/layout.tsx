import { localeRedirect } from "@/i18n/redirect";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getCurrentAccount } from "@/lib/account";
import { getBillingState } from "@/lib/billing";
import SettingsNav from "@/components/settings/SettingsNav";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: t("title") }),
    description: t("overviewSubtitle"),
    robots: { index: false, follow: false },
  };
}

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authenticated, user } = await getCurrentAccount();
  if (!authenticated || !user) return await localeRedirect("/login?callbackUrl=/settings");
  const t = await getTranslations("settings");
  const billing = getBillingState(user);
  const displayName = user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-navy text-lg font-bold text-white">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
              <p className="text-sm text-ink-muted">{displayName}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-ink-muted">
              {user.role === "supplier" ? t("roleSupplier") : t("roleBuyer")}
            </span>
            <span className="rounded-full border border-cyan/20 bg-cyan-soft px-3 py-1 font-semibold text-cyan">
              {t("planLabel")}: {billing.plan.name}
              {billing.trialing ? ` · ${t("trialActive")}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
          <SettingsNav isSupplier={user.role === "supplier"} />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
