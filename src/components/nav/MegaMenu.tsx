"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  ArrowRight,
  Binoculars,
  Boxes,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Columns3,
  Factory,
  LineChart,
  Mail,
  Newspaper,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import {
  SITE_NAV,
  navHrefPathname,
  type ColumnsMenu,
  type ListMenu,
  type NavIcon,
  type NavItem,
  type NavLink,
  type ProductsMenu,
} from "@/lib/site-nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  sparkles: Sparkles,
  binoculars: Binoculars,
  columns: Columns3,
  lineChart: LineChart,
  factory: Factory,
  boxes: Boxes,
  target: Target,
  building: Building2,
  newspaper: Newspaper,
  briefcase: Briefcase,
  mail: Mail,
};

export type NavTone = "dark" | "light";

/** Grace period so the pointer can cross the gap between trigger and panel. */
const CLOSE_DELAY_MS = 160;

type Translate = (key: string) => string;

function linkLabel(t: Translate, link: NavLink): string {
  return link.labelKey ? t(link.labelKey) : link.label ?? "";
}

/** Hrefs that mark a top-level item as "current" for the active route. */
function activeHrefs(item: NavItem): string[] {
  switch (item.kind) {
    case "link":
      return [item.href];
    case "list":
      return item.links.map((l) => l.href);
    case "products":
      return [item.intro.primary.href, item.featured.href];
    case "columns":
      return [];
  }
}

function isCurrent(pathname: string, hrefs: string[]): boolean {
  return hrefs.some((href) => {
    const p = navHrefPathname(href);
    if (p === "/") return pathname === "/";
    return pathname === p || pathname.startsWith(`${p}/`);
  });
}

function triggerClass(tone: NavTone, open: boolean, current: boolean): string {
  const base =
    "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2";
  if (tone === "dark") {
    const state = open
      ? "bg-white/10 text-white"
      : current
        ? "bg-white/10 text-cyan-glow"
        : "text-white/75 hover:bg-white/5 hover:text-white";
    return `${base} focus-visible:ring-cyan-glow/60 ${state}`;
  }
  const state = open
    ? "bg-slate-100 text-ink"
    : current
      ? "bg-cyan-soft text-cyan"
      : "text-ink-muted hover:bg-slate-50 hover:text-ink";
  return `${base} focus-visible:ring-cyan/40 ${state}`;
}

const PANEL_SURFACE =
  "overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-ink shadow-cardHover motion-safe:animate-[fade-up_0.22s_cubic-bezier(0.16,1,0.3,1)_both]";

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */

function IconBox({ icon, className = "" }: { icon: NavIcon; className?: string }) {
  const Icon = ICONS[icon];
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/5 text-cyan ${className}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

function ProductsPanel({ menu, t }: { menu: ProductsMenu; t: Translate }) {
  const { intro, featured, modules } = menu;
  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.05fr)] lg:gap-8">
      <div className="flex flex-col">
        <h3 className="font-display text-heading text-ink">{t(intro.headingKey)}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(intro.bodyKey)}</p>
        <div className="mt-auto flex flex-wrap items-center gap-4 pt-6">
          <Link href={intro.primary.href} className="btn-primary px-4 py-2 text-sm">
            {linkLabel(t, intro.primary)}
          </Link>
          <Link
            href={intro.secondary.href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-cyan transition-all hover:gap-2"
          >
            {linkLabel(t, intro.secondary)}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      <Link
        href={featured.href}
        className="group flex flex-col rounded-2xl border border-cyan/15 bg-gradient-to-br from-cyan-soft via-white to-white p-5 transition hover:border-cyan/30 hover:shadow-card"
      >
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan/20 bg-white text-cyan shadow-sm">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-5 font-display text-heading-sm text-ink">
          {t(featured.titlePrefixKey)} <span className="gradient-text">{t(featured.titleAccentKey)}</span>{" "}
          {t(featured.titleSuffixKey)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(featured.blurbKey)}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan transition-all group-hover:gap-2">
          {linkLabel(t, featured)}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </Link>

      <ul className="flex flex-col gap-2.5">
        {modules.map((mod) => (
          <li key={mod.href + mod.labelKey}>
            <Link
              href={mod.href}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-cyan/30 hover:bg-cyan-soft/50"
            >
              {mod.icon && <IconBox icon={mod.icon} />}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{linkLabel(t, mod)}</span>
                {mod.descriptionKey && (
                  <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{t(mod.descriptionKey)}</span>
                )}
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-ink-dim transition group-hover:translate-x-0.5 group-hover:text-cyan"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ColumnsPanel({ menu, t }: { menu: ColumnsMenu; t: Translate }) {
  return (
    <div className="grid gap-8 p-6 sm:grid-cols-3">
      {menu.columns.map((col) => (
        <div key={col.titleKey}>
          <h3 className="border-b border-slate-200 pb-3 font-display text-heading-sm text-ink">{t(col.titleKey)}</h3>
          <ul className="divide-y divide-slate-100">
            {col.links.map((link, i) => (
              <li key={`${link.href}-${link.labelKey ?? link.label ?? i}`}>
                <Link
                  href={link.href}
                  className="group flex items-center justify-between gap-3 py-2.5 text-sm font-medium text-ink-muted transition hover:text-cyan"
                >
                  {linkLabel(t, link)}
                  <ChevronRight
                    className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ListPanel({ menu, t }: { menu: ListMenu; t: Translate }) {
  return (
    <ul className="w-60 py-2">
      {menu.links.map((link) => {
        const Icon = link.icon ? ICONS[link.icon] : null;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-slate-50 hover:text-ink"
            >
              {Icon && <Icon className="h-4 w-4 text-cyan" aria-hidden />}
              {linkLabel(t, link)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop menu                                                        */
/* ------------------------------------------------------------------ */

type MegaMenuProps = {
  tone: NavTone;
  /**
   * Positioning for full-width panels (Products / Solutions). The panel is
   * `absolute`, so the header row that owns this nav must be `relative`.
   */
  panelClassName?: string;
  items?: NavItem[];
  className?: string;
};

export default function MegaMenu({
  tone,
  panelClassName = "inset-x-0 top-full mt-2",
  items = SITE_NAV,
  className = "",
}: MegaMenuProps) {
  const t = useTranslations("megaMenu");
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeTimer = useRef<number | null>(null);
  // Set while we programmatically refocus a trigger after Escape, so the
  // trigger's onFocus doesn't immediately reopen the menu we just closed.
  const suppressFocusOpen = useRef(false);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpenId(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  const openMenu = useCallback(
    (id: string) => {
      cancelClose();
      setOpenId(id);
    },
    [cancelClose],
  );

  useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenId(null);
      suppressFocusOpen.current = true;
      triggerRefs.current[openId]?.focus();
      suppressFocusOpen.current = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openId]);

  const onNavBlur = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && navRef.current && !navRef.current.contains(next)) setOpenId(null);
  };

  return (
    <nav
      ref={navRef}
      aria-label={t("menuLabel")}
      className={`items-center gap-0.5 ${className}`}
      onBlur={onNavBlur}
    >
      {items.map((item) => {
        const current = isCurrent(pathname, activeHrefs(item));
        if (item.kind === "link") {
          return (
            <Link key={item.id} href={item.href} className={triggerClass(tone, false, current)}>
              {t(item.labelKey)}
            </Link>
          );
        }

        const open = openId === item.id;
        const panelId = `mega-menu-${item.id}`;
        const anchored = item.kind === "list";

        return (
          <div
            key={item.id}
            className={anchored ? "relative" : undefined}
            onMouseEnter={() => openMenu(item.id)}
            onMouseLeave={scheduleClose}
          >
            <button
              ref={(el) => {
                triggerRefs.current[item.id] = el;
              }}
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              aria-controls={panelId}
              onClick={() => (open ? setOpenId(null) : openMenu(item.id))}
              onFocus={() => {
                if (!suppressFocusOpen.current) openMenu(item.id);
              }}
              className={triggerClass(tone, open, current)}
            >
              {t(item.labelKey)}
              <ChevronDown
                className={`h-3.5 w-3.5 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {open && (
              <div
                id={panelId}
                className={`absolute z-50 ${anchored ? "left-0 top-full pt-2" : panelClassName}`}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <div className={PANEL_SURFACE}>
                  {item.kind === "products" && <ProductsPanel menu={item} t={t} />}
                  {item.kind === "columns" && <ColumnsPanel menu={item} t={t} />}
                  {item.kind === "list" && <ListPanel menu={item} t={t} />}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile: collapsible groups for the drawers                          */
/* ------------------------------------------------------------------ */

type MobileProps = {
  tone: NavTone;
  onNavigate?: () => void;
  items?: NavItem[];
};

function mobileGroupLinks(item: Exclude<NavItem, { kind: "link" }>, t: Translate): { heading?: string; links: NavLink[] }[] {
  switch (item.kind) {
    case "products":
      return [
        {
          links: [
            item.intro.primary,
            {
              href: item.featured.href,
              label: `${t(item.featured.titlePrefixKey)} ${t(item.featured.titleAccentKey)} ${t(item.featured.titleSuffixKey)}`,
              icon: item.featured.icon,
            },
            ...item.modules,
            item.intro.secondary,
          ],
        },
      ];
    case "columns":
      return item.columns.map((c) => ({ heading: t(c.titleKey), links: c.links }));
    case "list":
      return [{ links: item.links }];
  }
}

export function MegaMenuMobile({ tone, onNavigate, items = SITE_NAV }: MobileProps) {
  const t = useTranslations("megaMenu");
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(null);

  const dark = tone === "dark";
  const rowClass = dark
    ? "text-white/85 hover:bg-white/5"
    : "text-ink hover:bg-slate-50";
  const currentClass = dark ? "text-cyan-glow" : "text-cyan";
  const subClass = dark ? "text-white/75 hover:bg-white/5 hover:text-white" : "text-ink-muted hover:bg-slate-50 hover:text-ink";
  const headingClass = dark ? "text-white/45" : "text-ink-dim";
  const iconClass = dark ? "text-cyan-glow" : "text-cyan";

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const current = isCurrent(pathname, activeHrefs(item));
        if (item.kind === "link") {
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${current ? currentClass : rowClass}`}
            >
              {t(item.labelKey)}
            </Link>
          );
        }
        const open = expanded === item.id;
        const groupId = `mobile-nav-${item.id}`;
        return (
          <div key={item.id}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={groupId}
              onClick={() => setExpanded(open ? null : item.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${
                current ? currentClass : rowClass
              }`}
            >
              {t(item.labelKey)}
              <ChevronDown
                className={`h-4 w-4 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            <div id={groupId} hidden={!open} className="pb-2 pl-3">
              {mobileGroupLinks(item, t).map((group, gi) => (
                <div key={group.heading ?? gi} className={gi > 0 ? "mt-2" : undefined}>
                  {group.heading && (
                    <p className={`px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider ${headingClass}`}>
                      {group.heading}
                    </p>
                  )}
                  {group.links.map((link, li) => {
                    const Icon = link.icon ? ICONS[link.icon] : null;
                    return (
                      <Link
                        key={`${link.href}-${link.labelKey ?? link.label ?? li}`}
                        href={link.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${subClass}`}
                      >
                        {Icon && <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden />}
                        {linkLabel(t, link)}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
