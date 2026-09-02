"use client";

/**
 * @author: @kokonutui
 * @description: Profile Dropdown (bound to Suplymate session)
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { CreditCard, LogOut, Settings, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type ProfileDropdownUser = {
  name: string;
  email: string;
  company?: string | null;
  avatarUrl?: string | null;
  subscriptionLabel?: string | null;
};

type Props = {
  user: ProfileDropdownUser;
  className?: string;
};

export default function ProfileDropdown({ user, className }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 transition hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-navy text-xs font-bold text-white">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </span>
        <div className="hidden text-left sm:block">
          <p className="text-xs font-semibold leading-tight text-ink">
            {user.name.split(" ")[0]}
          </p>
          {user.company && (
            <p className="text-[10px] text-ink-dim">{user.company}</p>
          )}
        </div>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-card"
        >
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[11px] text-ink-dim">{user.email}</p>
            {user.subscriptionLabel && (
              <p className="mt-1 inline-flex rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-semibold text-navy">
                {user.subscriptionLabel}
              </p>
            )}
          </div>

          <Link
            href="/settings/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink-muted transition hover:bg-slate-50 hover:text-ink"
          >
            <User className="h-4 w-4" aria-hidden />
            Profile
          </Link>
          <Link
            href="/settings/subscription"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink-muted transition hover:bg-slate-50 hover:text-ink"
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            Subscription
          </Link>
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink-muted transition hover:bg-slate-50 hover:text-ink"
          >
            <Settings className="h-4 w-4" aria-hidden />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-sm text-ink-muted transition hover:bg-slate-50 hover:text-ink"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
