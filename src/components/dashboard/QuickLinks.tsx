import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Binoculars, Columns3, LineChart, Settings, type LucideIcon } from "lucide-react";
import { HOME_PRODUCT_MODULE_LINKS } from "@/lib/home-product-module-links";
import DashboardCard from "./DashboardCard";

const LINKS: { key: "scout" | "compare" | "watch" | "settings"; href: string; icon: LucideIcon }[] = [
  { key: "scout", href: HOME_PRODUCT_MODULE_LINKS.scout, icon: Binoculars },
  { key: "compare", href: HOME_PRODUCT_MODULE_LINKS.compare, icon: Columns3 },
  { key: "watch", href: HOME_PRODUCT_MODULE_LINKS.watch, icon: LineChart },
  { key: "settings", href: "/settings", icon: Settings },
];

export default async function QuickLinks() {
  const t = await getTranslations("dashboard.quickLinks");

  return (
    <DashboardCard title={t("title")} description={t("description")} as="aside">
      <ul className="grid grid-cols-2 gap-2.5">
        {LINKS.map(({ key, href, icon: Icon }) => (
          <li key={key}>
            <Link
              href={href}
              className="group flex h-full flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan/30 hover:shadow-cardHover"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/15 bg-cyan-soft text-cyan transition group-hover:bg-cyan group-hover:text-white">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{t(`${key}.label`)}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-ink-dim">
                  {t(`${key}.hint`)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
