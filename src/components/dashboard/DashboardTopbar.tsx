"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Bell, Menu, Plus } from "lucide-react";
import type { DashboardUser } from "./types";
import ProfileDropdown from "@/components/kokonutui/profile-dropdown";
import ActionSearchBar from "@/components/kokonutui/action-search-bar";
import AIInputSearch from "@/components/kokonutui/ai-input-search";

type Props = {
  user: DashboardUser;
  unreadNotifications: number;
  onMenuClick: () => void;
};

export default function DashboardTopbar({
  user,
  unreadNotifications,
  onMenuClick,
}: Props) {
  const t = useTranslations("common");
  const nav = useTranslations("navigation");
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/60 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-ink-muted transition hover:bg-slate-100 lg:hidden"
          aria-label={nav("toggleMenu")}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden min-w-0 flex-1 md:block">
          <ActionSearchBar placeholder="Find suppliers, compare quotes, watch a price…" />
        </div>

        <div className="w-full max-w-xs sm:hidden">
          <AIInputSearch
            compact
            placeholder={t("search")}
            onSubmit={(q) =>
              router.push(`/suppliers?q=${encodeURIComponent(q)}`)
            }
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href="/ai-assistant"
          className="hidden items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-navy-mid sm:inline-flex"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {nav("aiAssistant")}
        </Link>

        <Link
          href="/notifications"
          className="relative rounded-lg p-2.5 text-ink-muted transition hover:bg-slate-100 hover:text-ink"
          aria-label={nav("notifications")}
        >
          <Bell className="h-5 w-5" />
          {unreadNotifications > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        <ProfileDropdown
          user={{
            name: user.name,
            email: user.email,
            company: user.company,
            subscriptionLabel: "Buyer",
          }}
        />
      </div>
    </header>
  );
}
