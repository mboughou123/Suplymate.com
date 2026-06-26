"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

type Props = {
  targetType: "SUPPLIER" | "PRODUCT" | "REVIEW" | "MESSAGE" | "CONVERSATION";
  targetId: string;
  label?: string;
};

export default function ReportButton({ targetType, targetId, label = "Report" }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason: reason.trim(), detail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not submit report");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <p className="text-xs text-emerald-700">
        Report submitted. Our team will review it.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-red-200 hover:text-red-700"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-ink">Report content</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Reports are reviewed by our moderation team. Sign in is required.
            </p>
            <label className="mt-4 block text-sm">
              <span className="text-ink-muted">Reason</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                <option value="Misleading information">Misleading information</option>
                <option value="Spam or scam">Spam or scam</option>
                <option value="Intellectual property">Intellectual property</option>
                <option value="Harassment or abuse">Harassment or abuse</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="mt-3 block text-sm">
              <span className="text-ink-muted">Details (optional)</span>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-ink-muted hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || !reason}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
