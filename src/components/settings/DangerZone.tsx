"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle } from "lucide-react";

export default function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setStatus("deleting");
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Could not delete your account.");
        setStatus("idle");
        return;
      }
      // Account gone — clear the session and leave.
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Network error. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-card">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden />
        <h2 className="text-sm font-bold text-ink">Delete account</h2>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Permanently delete your account and all associated data (conversations,
        RFQs, alerts, saved suppliers). This cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Type <span className="font-bold">DELETE</span> to confirm.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="mt-2 w-full max-w-xs rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
          />
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={confirmText !== "DELETE" || status === "deleting"}
              onClick={onDelete}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {status === "deleting" ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
