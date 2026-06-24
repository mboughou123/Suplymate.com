"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BadgeCheck, X } from "lucide-react";

type Props = { supplierId: string; supplierName: string };

// "Claim this profile" — opens a short form and submits a claim for manual admin
// review. Claiming NEVER verifies the supplier.
export default function ClaimProfileButton({ supplierId, supplierName }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ role: "", workEmail: "", phone: "", evidenceUrl: "", note: "" });

  const onOpen = () => {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=/supplier/${supplierId}`);
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit claim");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit claim");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/40 bg-cyan/5 px-3 py-1.5 text-xs font-semibold text-cyan transition hover:bg-cyan/10"
      >
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        Claim this profile
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 text-ink-dim hover:text-ink" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            {done ? (
              <div className="py-6 text-center">
                <BadgeCheck className="mx-auto h-10 w-10 text-emerald-500" aria-hidden />
                <h3 className="mt-3 font-display text-lg font-bold text-ink">Claim submitted</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Thanks — Suplymate will review your claim for {supplierName}. You&apos;ll be notified
                  of the decision. Claiming does not mark a supplier as verified.
                </p>
                <button type="button" onClick={() => setOpen(false)} className="mt-4 rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-white hover:bg-cyan/90">
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-ink">Claim {supplierName}</h3>
                <p className="mt-1 text-xs text-ink-muted">
                  Tell us how you&apos;re connected to this company. Suplymate manually reviews every
                  claim — approval links the profile to your account but does not verify it.
                </p>
                <div className="mt-4 space-y-3">
                  <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Your role (e.g. Sales Manager)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <input value={form.workEmail} onChange={(e) => setForm({ ...form, workEmail: e.target.value })} placeholder="Work email (company domain)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <input value={form.evidenceUrl} onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })} placeholder="Link proving affiliation (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Anything else we should know?" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <button type="button" onClick={submit} disabled={submitting} className="mt-4 w-full rounded-lg bg-cyan px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan/90 disabled:opacity-60">
                  {submitting ? "Submitting…" : "Submit claim"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
