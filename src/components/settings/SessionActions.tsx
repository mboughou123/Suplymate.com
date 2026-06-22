"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SessionActions() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <h2 className="text-sm font-bold text-ink">Sessions</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Sign out of your current session on this device.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-ink-dim"
        >
          Sign out all devices
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
            Coming soon
          </span>
        </button>
      </div>
    </section>
  );
}
